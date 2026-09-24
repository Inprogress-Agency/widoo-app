#!/usr/bin/env bash
# Synchronise le Status du Project « Widoo — MVP » avec les labels et l'état des issues :
#   issue ouverte  status:ready  → Prêts     } seulement depuis un statut vide, Cadrage ou Prêts :
#   issue ouverte  needs-design  → Cadrage   } un ticket parti en développement ne recule jamais
#   issue fermée   type:design   → Terminés  (quel que soit le statut courant)
# Un item En cours, À review, À déployer ou Terminés garde son statut malgré status:ready ou
# needs-design : le script le liste comme conservé. En cours et À review sont posés par CODE,
# À déployer par le workflow intégré, Terminés après vérification en staging.
# Écrit aussi, sur chaque epic ouverte (type:epic), le champ texte « Préparation » : l'état des tickets
# de sa liste cochable (prêts, en cours, attendent une maquette, à préparer, bloqués, faits). Le champ
# se crée une fois, sur décision d'Ilan ; absent, le script le signale et n'écrit rien sur les epics.
# --dry-run affiche les mêmes lignes qu'un vrai lancement, sans rien écrire. Idempotent.
# Usage : scripts/sync-project.sh [--dry-run]
# Chargé par source (validate-design.sh, sync-project.test.sh), il ne définit que les règles.
set -euo pipefail

# Règles jq, testées hors ligne par scripts/sync-project.test.sh.
# rule : statut cible d'une issue et label qui le donne. decide : same (déjà au statut cible),
# set (à changer) ou keep (conservé : ticket parti en développement).
# shellcheck disable=SC2016 # programme jq : ses $ ne sont pas des variables du shell
SYNC_RULES='
def rule: (.labels | map(.name? // .)) as $l
  | if .state == "CLOSED" and ($l | index("type:design")) then {target: "Terminés", label: "type:design"}
    elif .state == "OPEN" and ($l | index("status:ready")) then {target: "Prêts", label: "status:ready"}
    elif .state == "OPEN" and ($l | index("needs-design")) then {target: "Cadrage", label: "needs-design"}
    else empty end;
def unstarted: . == null or . == "" or . == "-" or . == "Cadrage" or . == "Prêts";
def decide($current; $target):
  if $current == $target then "same"
  elif $target == "Terminés" or ($current | unstarted) then "set"
  else "keep" end;
'

# $1 = statut courant (vide ou « - » si aucun), $2 = statut cible → same, set ou keep
status_decision() { jq -rn --arg c "$1" --arg t "$2" "$SYNC_RULES"' decide($c; $t)'; }

# Règles de préparation des epics, testées hors ligne par scripts/sync-project.test.sh.
# children : numéros cités par la liste cochable de l'epic. bucket($st) : case d'un ticket enfant,
# $st étant le statut de son item dans le Project. readiness_text : phrase écrite dans le champ.
# shellcheck disable=SC2016 # programme jq : ses $ ne sont pas des variables du shell
READINESS_RULES='
def children: [(.body // "") | scan("- \\[[ xX]\\] #([0-9]+)") | .[0] | tonumber] | unique;
def labelset: (.labels | map(.name? // .));
def bucket($st): labelset as $l
  | if .state == "CLOSED" then "faits"
    elif ($l | index("status:blocked")) then "bloqués"
    elif $st == "En cours" or $st == "À review" or $st == "À déployer" then "en cours"
    elif ($l | index("needs-design")) then "maquette"
    elif ($l | index("status:ready")) then "prêts"
    else "à préparer" end;
def phrase($k; $n):
  if $k == "prêts" then (if $n == 1 then "1 prêt" else "\($n) prêts" end)
  elif $k == "maquette" then (if $n == 1 then "1 attend une maquette" else "\($n) attendent une maquette" end)
  elif $k == "bloqués" then (if $n == 1 then "1 bloqué" else "\($n) bloqués" end)
  elif $k == "faits" then (if $n == 1 then "1 fait" else "\($n) faits" end)
  else "\($n) \($k)" end;
def readiness_text: . as $b
  | [ [ "prêts", "en cours", "maquette", "à préparer", "bloqués", "faits" ][] as $k
      | ($b | map(select(. == $k)) | length) as $n | select($n > 0) | phrase($k; $n) ]
  | if length == 0 then "aucun ticket" else join(" · ") end;
'

# Entrée sur stdin : les issues (gh issue list --json number,state,labels,body) puis les items du
# Project. Sortie TSV, une ligne par epic ouverte : décision (set, same, absent), n°, id d'item,
# texte courant du champ, texte attendu.
readiness_plan() {
  jq -rs "$READINESS_RULES"'
    .[0] as $issues
    | (reduce $issues[] as $i ({}; .[$i.number | tostring] = $i)) as $byNum
    | (reduce (.[1].items[] | select(.content.number != null)) as $it ({};
        ($it.content.number | tostring) as $k | if has($k) then . else .[$k] = $it end)) as $idx
    | $issues[] | select(.state == "OPEN" and (labelset | index("type:epic")))
    | . as $epic
    | [ $epic | children[] | tostring as $k | $byNum[$k] | select(. != null)
        | bucket(($idx[$k].status) // "") ] as $buckets
    | ($buckets | readiness_text) as $text
    | $idx[$epic.number | tostring] as $it
    | if $it == null then ["absent", $epic.number, "-", "-", $text]
      else [ (if ($it["préparation"] // "") == $text then "same" else "set" end),
             $epic.number, $it.id, ($it["préparation"] // "-"), $text ] end
    | @tsv'
}

# Entrée sur stdin : les issues (gh issue list --json number,state,labels) puis les items du
# Project (gh project item-list --format json). Sortie TSV, une ligne par issue visée par une
# règle : décision (set, keep, same, absent), n°, id d'item, statut courant, statut cible, label.
sync_plan() {
  jq -rs "$SYNC_RULES"'
    .[0] as $issues
    | (reduce (.[1].items[] | select(.content.number != null)) as $it ({};
        ($it.content.number | tostring) as $k | if has($k) then . else .[$k] = $it end)) as $idx
    | $issues[] | rule as $r | $idx[.number | tostring] as $it
    | if $it == null then ["absent", .number, "-", "-", $r.target, $r.label]
      else [decide($it.status; $r.target), .number, $it.id, ($it.status // "-"), $r.target, $r.label] end
    | @tsv'
}

main() {
  local repo owner title dry pnum pid fields fid plan issues items prep_fid rplan changed=0 kept=0 same=0 prep_set=0 prep_same=0
  repo="${REPO:-Inprogress-Agency/widoo-app}"; owner="${repo%%/*}"; title="${PROJECT_TITLE:-Widoo — MVP}"
  case "${1:-}" in
    "") dry="" ;;
    --dry-run) dry=1 ;;
    *) echo "argument inconnu : $1 — usage : scripts/sync-project.sh [--dry-run]" >&2; exit 2 ;;
  esac

  pnum=$(gh project list --owner "$owner" --format json --jq ".projects[] | select(.title == \"$title\") | .number" | head -1)
  [ -n "$pnum" ] || { echo "Project « $title » introuvable chez $owner" >&2; exit 1; }
  pid=$(gh project view "$pnum" --owner "$owner" --format json --jq '.id')
  fields=$(gh project field-list "$pnum" --owner "$owner" --format json)
  fid=$(jq -r '.fields[] | select(.name == "Status") | .id' <<<"$fields")
  opt() { jq -r --arg n "$1" '.fields[] | select(.name == "Status") | .options[] | select(.name == $n) | .id' <<<"$fields"; }
  for s in "Prêts" "Cadrage" "Terminés"; do [ -n "$(opt "$s")" ] || { echo "option Status « $s » absente du Project" >&2; exit 1; }; done

  issues=$(gh issue list -R "$repo" --state all --limit 500 --json number,state,labels,body)
  items=$(gh project item-list "$pnum" --owner "$owner" --limit 500 --format json)
  plan=$(printf '%s\n%s\n' "$issues" "$items" | sync_plan)
  while IFS=$'\t' read -r decision num item current target label; do
    case "$decision" in
      same) same=$((same+1)) ;;
      absent) echo "  #$num : absent du Project (le workflow Auto-add l'ajoutera)" ;;
      keep) echo "  #$num : $current conservé, $label ignoré (ticket parti en développement)"; kept=$((kept+1)) ;;
      set)
        # seule écriture du script, jamais en --dry-run
        [ -n "$dry" ] || gh project item-edit --project-id "$pid" --id "$item" --field-id "$fid" --single-select-option-id "$(opt "$target")" >/dev/null
        echo "  #$num : $current → $target"; changed=$((changed+1)) ;;
    esac
  done <<<"$plan"
  echo "sync-project${dry:+ (--dry-run, aucune écriture)} : $changed modifié(s), $kept conservé(s), $same déjà conforme(s)"

  # Préparation des epics : champ texte, réécrit seulement s'il change
  prep_fid=$(jq -r '.fields[] | select(.name == "Préparation") | .id' <<<"$fields")
  if [ -z "$prep_fid" ]; then
    echo "  champ « Préparation » absent du Project : rien d'écrit sur les epics (le créer relève d'une décision d'Ilan)"
    return 0
  fi
  rplan=$(printf '%s\n%s\n' "$issues" "$items" | readiness_plan)
  while IFS=$'\t' read -r decision num item current text; do
    case "$decision" in
      same) prep_same=$((prep_same+1)) ;;
      absent) echo "  epic #$num : absente du Project (le workflow Auto-add l'ajoutera)" ;;
      set)
        [ -n "$dry" ] || gh project item-edit --project-id "$pid" --id "$item" --field-id "$prep_fid" --text "$text" >/dev/null
        echo "  epic #$num : $text"; prep_set=$((prep_set+1)) ;;
    esac
  done <<<"$rplan"
  echo "préparation des epics${dry:+ (--dry-run)} : $prep_set mise(s) à jour, $prep_same déjà à jour"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
