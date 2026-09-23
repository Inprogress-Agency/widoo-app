#!/usr/bin/env bash
# Test hors ligne des règles de statut de sync-project.sh, garde de validate-design.sh comprise :
# données fictives, jq seul, ni gh ni réseau. Usage : scripts/sync-project.test.sh
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./sync-project.sh

fail=0
check() { # $1 = cas, $2 = obtenu, $3 = attendu
  if [ "$2" = "$3" ]; then echo "ok     $1"; else echo "ÉCHEC  $1 : obtenu « $2 », attendu « $3 »"; fail=1; fi
}

# Issues fictives : n°, état, labels. Items fictifs : statut courant (absent = vide).
issue() { jq -nc --argjson n "$1" --arg s "$2" --arg l "$3" '{number: $n, state: $s, labels: ($l | split(",") | map({name: .}))}'; }
item() { jq -nc --argjson n "$1" --arg s "$2" '{id: "ITEM_\($n)", content: {number: $n}} + (if $s == "" then {} else {status: $s} end)'; }
issues=$(jq -sc . <<EOF
$(issue 901 OPEN status:ready)
$(issue 902 OPEN status:ready)
$(issue 903 OPEN status:ready)
$(issue 904 OPEN status:ready)
$(issue 905 OPEN status:ready)
$(issue 906 OPEN status:ready)
$(issue 907 OPEN status:ready)
$(issue 908 OPEN needs-design)
$(issue 909 OPEN needs-design)
$(issue 910 OPEN needs-design)
$(issue 911 OPEN needs-design)
$(issue 912 CLOSED type:design)
$(issue 913 CLOSED type:design)
$(issue 914 CLOSED type:design)
$(issue 915 OPEN type:feature)
$(issue 916 OPEN status:ready)
$(issue 917 OPEN status:ready,needs-design)
EOF
)
items=$(jq -sc '{items: .}' <<EOF
{"id": "DRAFT", "content": {"title": "brouillon sans numéro"}}
$(item 901 "")
$(item 902 Cadrage)
$(item 903 Prêts)
$(item 904 "En cours")
$(item 905 "À review")
$(item 906 "À déployer")
$(item 907 Terminés)
$(item 908 Prêts)
$(item 909 "À review")
$(item 910 "")
$(item 911 "En cours")
$(item 912 "À déployer")
$(item 913 "")
$(item 914 Terminés)
$(item 915 Cadrage)
$(item 917 Cadrage)
EOF
)
plan=$(printf '%s\n%s\n' "$issues" "$items" | sync_plan)
row() { awk -F'\t' -v n="$1" '$2 == n { print $1 " : " $4 " → " $5 }' <<<"$plan"; }

echo "sync-project.sh — plan"
check "#901 vide + status:ready → Prêts" "$(row 901)" "set : - → Prêts"
check "#902 Cadrage + status:ready → Prêts" "$(row 902)" "set : Cadrage → Prêts"
check "#903 Prêts + status:ready, déjà conforme" "$(row 903)" "same : Prêts → Prêts"
check "#904 En cours + status:ready conservé" "$(row 904)" "keep : En cours → Prêts"
check "#905 À review + status:ready conservé" "$(row 905)" "keep : À review → Prêts"
check "#906 À déployer + status:ready conservé" "$(row 906)" "keep : À déployer → Prêts"
check "#907 Terminés + status:ready conservé" "$(row 907)" "keep : Terminés → Prêts"
check "#908 Prêts + needs-design → Cadrage" "$(row 908)" "set : Prêts → Cadrage"
check "#909 À review + needs-design conservé" "$(row 909)" "keep : À review → Cadrage"
check "#910 vide + needs-design → Cadrage" "$(row 910)" "set : - → Cadrage"
check "#911 En cours + needs-design conservé" "$(row 911)" "keep : En cours → Cadrage"
check "#912 type:design fermé À déployer → Terminés" "$(row 912)" "set : À déployer → Terminés"
check "#913 type:design fermé vide → Terminés" "$(row 913)" "set : - → Terminés"
check "#914 type:design fermé Terminés, déjà conforme" "$(row 914)" "same : Terminés → Terminés"
check "#915 sans label de statut : aucune règle" "$(row 915)" ""
check "#916 absent du Project" "$(row 916)" "absent : - → Prêts"
check "#917 status:ready l'emporte sur needs-design" "$(row 917)" "set : Cadrage → Prêts"
check "label écarté cité pour #905" "$(awk -F'\t' '$2 == 905 { print $6 }' <<<"$plan")" "status:ready"

echo "validate-design.sh — garde avant de poser Prêts ou Terminés"
for s in "En cours" "À review" "À déployer" "Terminés"; do
  check "ticket dev $s : Prêts non posé" "$(status_decision "$s" Prêts)" keep
done
check "ticket dev vide → Prêts" "$(status_decision - Prêts)" set
check "ticket dev Cadrage → Prêts" "$(status_decision Cadrage Prêts)" set
check "ticket design À déployer → Terminés" "$(status_decision "À déployer" Terminés)" set

echo "sync-project.sh — argument inconnu refusé avant tout appel (PATH vide : gh inaccessible)"
code=0; PATH=/nonexistent "$BASH" ./sync-project.sh --dryrun 2>/dev/null || code=$?
check "--dryrun (faute de frappe) → code 2" "$code" 2

if [ "$fail" != 0 ]; then echo "sync-project.test : échec" >&2; exit 1; fi
echo "sync-project.test : tout est vert"
