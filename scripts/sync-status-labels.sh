#!/usr/bin/env bash
# Tient à jour status:ready et status:blocked sur les tickets ouverts, et leur colonne du Project :
#   ticket ouvert, ni type:epic, ni type:design, ni needs-design, ni inbox, ni human (tâche humaine)
#     aucun bloqueur ouvert (issue_dependencies_summary.blocked_by = 0)  → status:ready,   colonne Prêts
#     au moins un bloqueur ouvert                                        → status:blocked, colonne Bloqués
# La première étiquette de statut d'un ticket ne se pose jamais tant qu'il est en Cadrage, ou sans
# colonne lisible : c'est le MANAGER ou le chef de projet qui l'en sort. Un ticket déjà étiqueté y
# est tenu à jour comme ailleurs.
# Un ticket en développement n'est jamais touché, ni ses labels ni sa colonne : Status En cours,
# À review ou À déployer dans le Project, ou, que le Project soit lisible ou non, une branche
# issue/N-… ou une PR ouverte qui le ferme.
# Le Project se lit et s'écrit avec PROJECT_TOKEN (jeton d'Ilan, Projects en écriture sur
# l'organisation) ; sans lui, seuls les labels déjà posés sont tenus. Une colonne absente du Project
# (Bloqués tant qu'Ilan ne l'a pas créée) est signalée, jamais créée.
# Journal en Markdown dans $GITHUB_STEP_SUMMARY (résumé du job), sinon sur la sortie standard.
# --dry-run : mêmes décisions et même journal, sans rien écrire. Idempotent.
# Usage : scripts/sync-status-labels.sh [--dry-run]
# Chargé par source (sync-status-labels.test.sh), il ne définit que les règles.
set -euo pipefail

# Règles jq, testées hors ligne par scripts/sync-status-labels.test.sh. Entrée : {issues: [{number,
# title, state, labels, blocked_by, in_dev}], project: {available, columns, items: {"<n>": {id,
# status}}}}. Sortie TSV, une ligne par ticket visé : labels (set, same, keep, skip), n°, labels de
# statut courants, label voulu, colonne (move, same, keep, skip, no-project, no-item, no-column),
# colonne courante, colonne voulue, id d'item, titre. keep : en développement ; skip : sans étiquette
# et pas sorti du Cadrage.
# shellcheck disable=SC2016 # programme jq : ses $ ne sont pas des variables du shell
STATUS_RULES='
def labelset: (.labels | map(.name? // .));
def excluded: labelset | (index("type:epic") or index("type:design") or index("needs-design") or index("inbox") or index("human"));
def wanted: if (.blocked_by // 0) > 0 then "status:blocked" else "status:ready" end;
def column_for($label): if $label == "status:blocked" then "Bloqués" else "Prêts" end;
def in_progress: . == "En cours" or . == "À review" or . == "À déployer";
def unplaced: . == "" or . == "Cadrage";
def status_plan:
  . as $in
  | $in.issues[]
  | select((.state | ascii_downcase) == "open" and (excluded | not))
  | . as $i
  | ($in.project.items[$i.number | tostring] // null) as $item
  | (($item.status) // "") as $col
  | wanted as $want
  | column_for($want) as $target
  | [labelset[] | select(. == "status:ready" or . == "status:blocked")] as $have
  | (if ($col | in_progress) or ($i.in_dev // false) then "keep"
     elif $have == [] and ($col | unplaced) then "skip"
     elif $have == [$want] then "same"
     else "set" end) as $labels
  | (if $labels == "keep" or $labels == "skip" then $labels
     elif ($in.project.available | not) then "no-project"
     elif $item == null then "no-item"
     elif ($in.project.columns | index($target)) == null then "no-column"
     elif $col == $target then "same"
     else "move" end) as $move
  | [$labels, $i.number, ($have | join(",") | if . == "" then "-" else . end), $want,
     $move, (if $col == "" then "-" else $col end), $target, ($item.id // "-"), $i.title]
  | @tsv;
'

# Entrée sur stdin : l'objet décrit ci-dessus. Sortie : le plan TSV.
status_plan() { jq -r "$STATUS_RULES"' status_plan'; }

# $1 = labels de statut courants (« a,b » ou « - »), $2 = label voulu → arguments de gh issue edit.
label_edit_args() {
  local label
  printf '%s\n' --add-label "$2"
  for label in ${1//,/ }; do
    [ "$label" = "-" ] || [ "$label" = "$2" ] || printf '%s\n' --remove-label "$label"
  done
}

# Entrée : le plan TSV. Sortie : le journal Markdown ($1 = « appliqué » ou « simulation », $2 = dépôt,
# $3 = note sur le Project).
status_summary() {
  local plan mode=$1 repo=$2 note=$3
  plan=$(cat)
  awk -F'\t' -v mode="$mode" -v repo="$repo" -v note="$note" '
    function link(n) { return "[#" n "](https://github.com/" repo "/issues/" n ")" }
    # Un « | » dans un titre casserait le tableau.
    { gsub(/\|/, "\\&#124;", $9) }
    function col(move, cur, target) {
      if (move == "move") return cur " → " target
      if (move == "no-column") return "« " target " » absente du Project"
      if (move == "no-item") return "hors du Project"
      return "—"
    }
    $1 == "set" { changed[++nc] = "| " link($2) " | " $3 " | " $4 " | " col($5, $6, $7) " | " $9 " |" }
    $1 == "same" && $5 == "move" { moved[++nm] = "| " link($2) " | " $4 " | " col($5, $6, $7) " | " $9 " |" }
    $1 == "keep" && $3 != $4 { kept[++nk] = "| " link($2) " | " $3 " | " $4 " | " $6 " | " $9 " |" }
    $5 == "no-column" { nocol[$7]++ }
    $1 == "skip" { ns++ }
    { total++ }
    END {
      print "## Étiquettes de statut (" mode ")"
      print ""
      print total " ticket(s) examiné(s) : " nc + 0 " étiquette(s) changée(s), " nm + 0 " colonne(s) seule(s) déplacée(s), " nk + 0 " conservé(s) car en développement."
      if (note != "") { print ""; print "> " note }
      if (ns) { print ""; print "> " ns " ticket(s) sans étiquette de statut, pas sorti(s) du Cadrage : laissé(s) au MANAGER." }
      for (c in nocol) { print ""; print "> Colonne « " c " » absente du Project : " nocol[c] " ticket(s) laissé(s) dans leur colonne." }
      if (nc) { print ""; print "| Ticket | Avant | Après | Colonne | Titre |"; print "|---|---|---|---|---|"; for (i = 1; i <= nc; i++) print changed[i] }
      if (nm) { print ""; print "Colonne seule :"; print ""; print "| Ticket | Statut | Colonne | Titre |"; print "|---|---|---|---|"; for (i = 1; i <= nm; i++) print moved[i] }
      if (nk) { print ""; print "Conservés, en développement (la règle donnerait un autre statut) :"; print ""; print "| Ticket | Actuel | Règle | Colonne | Titre |"; print "|---|---|---|---|---|"; for (i = 1; i <= nk; i++) print kept[i] }
    }' <<<"$plan"
}

main() {
  local repo=${REPO:-Inprogress-Agency/widoo-app} dry=""
  [ "${1:-}" = "--dry-run" ] || [ "${DRY_RUN:-false}" = "true" ] && dry=1
  local owner=${repo%%/*} name=${repo#*/} title=${PROJECT_TITLE:-Widoo — MVP}

  # Tickets ouverts, sans les PR, avec leurs bloqueurs ouverts.
  local issues in_dev project note="" pnum="" pid="" fields=""
  issues=$(gh api --paginate "repos/$repo/issues?state=open&per_page=100" \
    --jq '.[] | select(.pull_request == null)
      | {number, title, state, labels: [.labels[].name], blocked_by: (.issue_dependencies_summary.blocked_by // 0)}' | jq -s .)

  # En développement : ticket fermé par une PR ouverte, ou branche issue/N-… (PR ou non).
  # shellcheck disable=SC2016 # requête GraphQL : $endCursor est une variable GraphQL
  in_dev=$({
    gh api graphql --paginate -F owner="$owner" -F name="$name" -f query='
      query($owner: String!, $name: String!, $endCursor: String) {
        repository(owner: $owner, name: $name) {
          pullRequests(states: OPEN, first: 100, after: $endCursor) {
            pageInfo { hasNextPage endCursor }
            nodes { headRefName closingIssuesReferences(first: 20) { nodes { number } } }
          }
        }
      }' --jq '.data.repository.pullRequests.nodes[]
        | (.closingIssuesReferences.nodes[].number), (.headRefName | capture("^issue/(?<n>[0-9]+)-").n)'
    gh api --paginate "repos/$repo/branches?per_page=100" --jq '.[].name | capture("^issue/(?<n>[0-9]+)-").n'
  } | jq -Rs '[split("\n")[] | select(test("^[0-9]+$")) | tonumber] | unique')

  # Project : colonnes et items, avec PROJECT_TOKEN seulement.
  # Jeton refusé ou trop court : l'action échoue en le disant, plutôt que de tenir les labels sans
  # voir les colonnes En cours, À review et À déployer.
  if [ -n "${PROJECT_TOKEN:-}" ]; then
    pnum=$(GH_TOKEN=$PROJECT_TOKEN gh project list --owner "$owner" --format json \
      --jq ".projects[] | select(.title == \"$title\") | .number" | head -1)
    [ -n "$pnum" ] || { echo "::error::Project « $title » introuvable avec PROJECT_TOKEN : jeton expiré, révoqué ou sans Projects en lecture et écriture sur $owner." >&2; exit 1; }
    pid=$(GH_TOKEN=$PROJECT_TOKEN gh project view "$pnum" --owner "$owner" --format json --jq '.id')
    fields=$(GH_TOKEN=$PROJECT_TOKEN gh project field-list "$pnum" --owner "$owner" --format json)
    project=$(GH_TOKEN=$PROJECT_TOKEN gh project item-list "$pnum" --owner "$owner" --limit 1000 --format json \
      | jq --argjson f "$fields" --arg repo "$repo" '{available: true,
          columns: [$f.fields[] | select(.name == "Status") | .options[].name],
          items: (reduce (.items[] | select(.content.type == "Issue" and .content.repository == $repo)) as $it
            ({}; .[$it.content.number | tostring] = {id: $it.id, status: ($it.status // "")}))}')
    [ "$(jq '.items | length' <<<"$project")" -gt 0 ] || { echo "::error::PROJECT_TOKEN ne voit aucun ticket de $repo dans le Project « $title » : il lui faut aussi Issues en lecture sur le dépôt." >&2; exit 1; }
  else
    project='{"available": false}'
    note="Project non lu : secret PROJECT_TOKEN absent (labels déjà posés seuls, protection par branche et PR)."
  fi

  local plan
  plan=$(jq -n --argjson issues "$issues" --argjson dev "$in_dev" --argjson project "$project" \
    '{issues: [$issues[] | . + {in_dev: (.number as $n | $dev | index($n) != null)}], project: $project}' | status_plan)

  local status_fid="" row labels num have want move col target item
  [ -z "$fields" ] || status_fid=$(jq -r '.fields[] | select(.name == "Status") | .id' <<<"$fields")
  while IFS=$'\t' read -r labels num have want move col target item _; do
    [ -n "$num" ] || continue
    if [ "$labels" = "set" ]; then
      local args=()
      while IFS= read -r row; do args+=("$row"); done < <(label_edit_args "$have" "$want")
      if [ -n "$dry" ]; then echo "+ gh issue edit $num ${args[*]}"; else gh issue edit "$num" -R "$repo" "${args[@]}" >/dev/null; fi
    fi
    if [ "$move" = "move" ]; then
      local oid
      oid=$(jq -r --arg n "$target" '.fields[] | select(.name == "Status") | .options[] | select(.name == $n) | .id' <<<"$fields")
      if [ -n "$dry" ]; then echo "+ Project : #$num $col → $target"
      else GH_TOKEN=$PROJECT_TOKEN gh project item-edit --project-id "$pid" --id "$item" --field-id "$status_fid" --single-select-option-id "$oid" >/dev/null; fi
    fi
  done <<<"$plan"

  local out=${GITHUB_STEP_SUMMARY:-/dev/stdout}
  status_summary "$([ -n "$dry" ] && echo simulation || echo appliqué)" "$repo" "$note" <<<"$plan" >>"$out"
}

# Exécuté directement : lance ; chargé par source (tests) : ne définit que les règles.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
