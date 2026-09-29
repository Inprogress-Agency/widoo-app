#!/usr/bin/env bash
# Test hors ligne des règles de sync-status-labels.sh : tickets fictifs, jq seul, ni gh ni réseau.
# Usage : scripts/sync-status-labels.test.sh
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./sync-status-labels.sh

fail=0
check() { # $1 = cas, $2 = obtenu, $3 = attendu
  if [ "$2" = "$3" ]; then echo "ok     $1"; else echo "ÉCHEC  $1 : obtenu « $2 », attendu « $3 »"; fail=1; fi
}

# Ticket fictif : n°, état, labels, bloqueurs ouverts, en développement (branche ou PR).
issue() {
  jq -nc --argjson n "$1" --arg s "$2" --arg l "$3" --argjson b "$4" --argjson d "${5:-false}" \
    '{number: $n, title: "Ticket \($n)", state: $s, labels: ($l | split(",") | map(select(. != ""))), blocked_by: $b, in_dev: $d}'
}
issues=$(jq -sc . <<EOF
$(issue 901 open type:feature 0)
$(issue 902 open type:feature,status:ready 0)
$(issue 903 open type:feature,status:ready 2)
$(issue 904 open type:feature,status:blocked 0)
$(issue 905 open type:feature,status:blocked 1)
$(issue 906 open type:feature,status:ready,status:blocked 0)
$(issue 907 open type:epic 0)
$(issue 908 open type:design 1)
$(issue 909 open type:feature,needs-design 1)
$(issue 910 open inbox 0)
$(issue 911 closed type:feature,status:ready 2)
$(issue 912 open type:feature,status:ready 1)
$(issue 913 open type:feature,status:ready 1)
$(issue 914 open type:feature,status:ready 1)
$(issue 915 open type:feature 1 true)
$(issue 916 open type:feature,status:blocked 0)
$(issue 917 open type:feature 0)
$(issue 918 open type:bug 3)
EOF
)
# Colonnes : sans Bloqués, comme le Project aujourd'hui, puis avec.
item() { jq -nc --arg n "$1" --arg s "$2" '{($n): {id: "ITEM_\($n)", status: $s}}'; }
items=$(jq -sc 'add' <<EOF
$(item 901 Cadrage)
$(item 902 Prêts)
$(item 903 Prêts)
$(item 904 "")
$(item 905 Prêts)
$(item 906 Prêts)
$(item 912 "En cours")
$(item 913 "À review")
$(item 914 "À déployer")
$(item 915 Prêts)
$(item 916 Terminés)
$(item 918 Prêts)
EOF
)
without_blocked='["Cadrage","Prêts","En cours","À review","À déployer","Terminés"]'
with_blocked='["Cadrage","Prêts","Bloqués","En cours","À review","À déployer","Terminés"]'
plan_with() { # $1 = colonnes du Project, ou « none » sans Project
  local project
  if [ "$1" = none ]; then project='{"available": false}'
  else project=$(jq -nc --argjson c "$1" --argjson i "$items" '{available: true, columns: $c, items: $i}'); fi
  jq -nc --argjson issues "$issues" --argjson project "$project" '{issues: $issues, project: $project}' | status_plan
}
row() { awk -F'\t' -v n="$2" '$2 == n { print $1 " " $3 " → " $4 " | " $5 " " $6 " → " $7 }' <<<"$1"; }

echo "sync-status-labels.sh — étiquettes"
plan=$(plan_with "$with_blocked")
check "#901 sans étiquette ni bloqueur : prêt" "$(row "$plan" 901)" "set - → status:ready | move Cadrage → Prêts"
check "#902 déjà prêt, déjà en Prêts : rien" "$(row "$plan" 902)" "same status:ready → status:ready | same Prêts → Prêts"
check "#903 prêt mais deux bloqueurs ouverts : bloqué" "$(row "$plan" 903)" "set status:ready → status:blocked | move Prêts → Bloqués"
check "#904 bloqué sans bloqueur ouvert : prêt, colonne vide" "$(row "$plan" 904)" "set status:blocked → status:ready | move - → Prêts"
check "#905 bloqué avec bloqueur : colonne seule corrigée" "$(row "$plan" 905)" "same status:blocked → status:blocked | move Prêts → Bloqués"
check "#906 les deux étiquettes : une seule reste" "$(row "$plan" 906)" "set status:ready,status:blocked → status:ready | same Prêts → Prêts"
check "#916 rouvert depuis Terminés : replacé" "$(row "$plan" 916)" "set status:blocked → status:ready | move Terminés → Prêts"
check "#917 hors du Project : étiquette seule" "$(row "$plan" 917)" "set - → status:ready | no-item - → Prêts"
check "#918 bug bloqué, Prêts : bloqué" "$(row "$plan" 918)" "set - → status:blocked | move Prêts → Bloqués"
for n in 907 908 909 910 911; do
  check "#$n hors règle (epic, design, needs-design, inbox, fermé) : absent du plan" "$(row "$plan" "$n")" ""
done

echo "sync-status-labels.sh — tickets en développement, jamais touchés"
check "#912 En cours" "$(row "$plan" 912)" "keep status:ready → status:blocked | keep En cours → Bloqués"
check "#913 À review" "$(row "$plan" 913)" "keep status:ready → status:blocked | keep À review → Bloqués"
check "#914 À déployer" "$(row "$plan" 914)" "keep status:ready → status:blocked | keep À déployer → Bloqués"
check "#915 branche ou PR ouverte, même en Prêts" "$(row "$plan" 915)" "keep - → status:blocked | keep Prêts → Bloqués"

echo "sync-status-labels.sh — Project sans colonne Bloqués, puis illisible"
plan=$(plan_with "$without_blocked")
check "#903 bloqué, colonne Bloqués absente : signalé" "$(row "$plan" 903)" "set status:ready → status:blocked | no-column Prêts → Bloqués"
check "#901 prêt : déplacé quand même" "$(row "$plan" 901)" "set - → status:ready | move Cadrage → Prêts"
plan=$(plan_with none)
check "#901 sans PROJECT_TOKEN : étiquette seule" "$(row "$plan" 901)" "set - → status:ready | no-project - → Prêts"
check "#912 sans Project : protégé seulement par branche ou PR" "$(row "$plan" 912)" "set status:ready → status:blocked | no-project - → Bloqués"
check "#915 sans Project : protégé par sa branche" "$(row "$plan" 915)" "keep - → status:blocked | keep - → Bloqués"

echo "sync-status-labels.sh — arguments de gh issue edit"
check "ajout seul" "$(label_edit_args - status:ready | paste -sd' ' -)" "--add-label status:ready"
check "remplacement" "$(label_edit_args status:ready status:blocked | paste -sd' ' -)" "--add-label status:blocked --remove-label status:ready"
check "doublon retiré, voulu gardé" "$(label_edit_args status:ready,status:blocked status:ready | paste -sd' ' -)" "--add-label status:ready --remove-label status:blocked"

echo "sync-status-labels.sh — journal"
summary=$(plan_with "$without_blocked" | status_summary simulation Org/repo "")
# 7 changements et 4 conservés ; #905, déjà bloqué, n'attend que la colonne Bloqués.
check "lignes du journal" "$(grep -c '^| \[#' <<<"$summary")" "11"
check "lien du ticket" "$(grep -c '\[#903\](https://github.com/Org/repo/issues/903)' <<<"$summary")" "1"
check "colonne absente signalée" "$(grep -c 'Colonne « Bloqués » absente du Project' <<<"$summary")" "1"
check "conservés listés" "$(grep -c '^| \[#91[2-5]\]' <<<"$summary")" "4"
check "« | » d'un titre échappé" "$(printf 'set\t1\t-\tstatus:ready\tsame\tPrêts\tPrêts\tI\ta | b\n' | status_summary x O/r "" | grep -c 'a &#124; b |$')" "1"

# main de bout en bout, dans un bash à part (set -e intact) : gh simulé par une fonction exportée qui
# lit les réponses d'API fictives de $tmp et y consigne chaque écriture avec son jeton.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export tmp
cat >"$tmp/fields.json" <<'EOF'
{"fields": [{"id": "F_TITLE", "name": "Title"}, {"id": "F_STATUS", "name": "Status", "options": [
  {"id": "O_CADRAGE", "name": "Cadrage"}, {"id": "O_PRETS", "name": "Prêts"}, {"id": "O_BLOQUES", "name": "Bloqués"},
  {"id": "O_EN_COURS", "name": "En cours"}]}]}
EOF
cat >"$tmp/items.json" <<'EOF'
{"items": [
  {"id": "I_901", "status": "Cadrage", "content": {"type": "Issue", "number": 901, "repository": "Org/repo"}},
  {"id": "I_OTHER", "status": "Cadrage", "content": {"type": "Issue", "number": 902, "repository": "Org/other"}},
  {"id": "I_DRAFT", "status": "Prêts", "content": {"type": "DraftIssue", "title": "brouillon"}},
  {"id": "I_902", "status": "Prêts", "content": {"type": "Issue", "number": 902, "repository": "Org/repo"}},
  {"id": "I_903", "status": "Prêts", "content": {"type": "Issue", "number": 903, "repository": "Org/repo"}},
  {"id": "I_912", "status": "En cours", "content": {"type": "Issue", "number": 912, "repository": "Org/repo"}}]}
EOF
cat >"$tmp/issues.json" <<'EOF'
[{"number": 901, "title": "Sans étiquette", "state": "open", "labels": [{"name": "type:feature"}], "issue_dependencies_summary": {"blocked_by": 0, "total_blocked_by": 3}},
 {"number": 902, "title": "Déjà prêt", "state": "open", "labels": [{"name": "status:ready"}], "issue_dependencies_summary": {"blocked_by": 0}},
 {"number": 903, "title": "Prêt mais bloqué", "state": "open", "labels": [{"name": "status:ready"}], "issue_dependencies_summary": {"blocked_by": 2}},
 {"number": 912, "title": "En cours, sans branche poussée", "state": "open", "labels": [{"name": "status:ready"}], "issue_dependencies_summary": {"blocked_by": 1}},
 {"number": 915, "title": "Branche poussée", "state": "open", "labels": [], "issue_dependencies_summary": {"blocked_by": 1}},
 {"number": 919, "title": "Fermé par une PR ouverte", "state": "open", "labels": [], "issue_dependencies_summary": {"blocked_by": 0}},
 {"number": 950, "title": "Une PR", "state": "open", "labels": [], "pull_request": {}, "issue_dependencies_summary": null}]
EOF
echo '{"data": {"repository": {"pullRequests": {"nodes": [{"headRefName": "chore/x", "closingIssuesReferences": {"nodes": [{"number": 919}]}}]}}}}' >"$tmp/prs.json"
echo '[{"name": "main"}, {"name": "issue/915-slug"}, {"name": "issue/abc"}]' >"$tmp/branches.json"
echo '{"projects": [{"number": 3, "title": "Autre"}, {"number": 1, "title": "Widoo — MVP"}]}' >"$tmp/projects.json"
gh() {
  local a filter="" file prev=""
  for a in "$@"; do [ "$prev" = --jq ] && filter=$a; prev=$a; done
  case "$*" in
    "issue edit "* | "project item-edit "*) echo "[$GH_TOKEN] $*" >>"$tmp/writes"; return 0 ;;
    "api --paginate repos/Org/repo/issues?"*) file="issues" ;;
    "api graphql "*) file="prs" ;;
    "api --paginate repos/Org/repo/branches?"*) file="branches" ;;
    "project list "*) file="projects" ;;
    "project view 1 "*) echo '{"id": "P_1"}' >"$tmp/view.json"; file=view ;;
    "project field-list 1 "*) file="fields" ;;
    "project item-list 1 "*) file="items" ;;
    *) echo "gh inattendu : $*" >&2; return 1 ;;
  esac
  if [ -n "$filter" ]; then jq -r "$filter" "$tmp/$file.json"; else cat "$tmp/$file.json"; fi
}
export -f gh
run_main() { # $@ = arguments de main ; code de sortie dans $status, sortie, écritures et journal dans $tmp
  : >"$tmp/writes"; : >"$tmp/summary"; status=0
  GH_TOKEN=gh-token REPO=Org/repo GITHUB_STEP_SUMMARY=$tmp/summary \
    "$BASH" -c 'source ./sync-status-labels.sh && main "$@"' main "$@" >"$tmp/out" 2>&1 || status=$?
}

echo "sync-status-labels.sh — main, gh simulé"
PROJECT_TOKEN=project-token run_main
check "réussite" "$status" "0"
check "écritures, chacune avec son jeton" "$(cat "$tmp/writes")" "[gh-token] issue edit 901 -R Org/repo --add-label status:ready
[project-token] project item-edit --project-id P_1 --id I_901 --field-id F_STATUS --single-select-option-id O_PRETS
[gh-token] issue edit 903 -R Org/repo --add-label status:blocked --remove-label status:ready
[project-token] project item-edit --project-id P_1 --id I_903 --field-id F_STATUS --single-select-option-id O_BLOQUES"
check "journal : la PR écartée, 6 tickets examinés" "$(grep -c '^6 ticket(s) examiné(s) : 2 étiquette(s) changée(s)' "$tmp/summary")" "1"
check "journal : mode appliqué" "$(grep -c '(appliqué)' "$tmp/summary")" "1"
PROJECT_TOKEN=project-token run_main --dry-run
check "simulation : aucune écriture" "$status $(cat "$tmp/writes")" "0 "
check "simulation : écritures annoncées" "$(grep -c '^+ ' "$tmp/out")" "4"
PROJECT_TOKEN="" run_main
check "sans PROJECT_TOKEN : labels seuls, #912 sans branche touché" "$(cut -d' ' -f1-4 "$tmp/writes" | paste -sd' ' -)" "[gh-token] issue edit 901 [gh-token] issue edit 903 [gh-token] issue edit 912"
check "sans PROJECT_TOKEN : signalé" "$(grep -c 'secret PROJECT_TOKEN absent' "$tmp/summary")" "1"
echo '{"items": [{"id": "I_OTHER", "status": "Cadrage", "content": {"type": "Issue", "number": 902, "repository": "Org/other"}}]}' >"$tmp/items.json"
PROJECT_TOKEN=project-token run_main
check "jeton sans accès aux tickets : échec, rien d'écrit" "$status $(wc -l <"$tmp/writes" | tr -d ' ') $(grep -c 'Issues en lecture' "$tmp/out")" "1 0 1"

if [ "$fail" = 0 ]; then echo "sync-status-labels.test : tout est vert"; else echo "sync-status-labels.test : échec"; exit 1; fi
