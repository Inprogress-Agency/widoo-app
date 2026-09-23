#!/usr/bin/env bash
# Synchronise le Status du Project « Widoo — MVP » avec les labels et l'état des issues :
#   issue ouverte  status:ready  → Prêts
#   issue ouverte  needs-design  → Cadrage
#   issue fermée   type:design   → Terminés
# Les autres statuts (En cours, À review, À déployer) sont posés par CODE et par les
# workflows intégrés : le script ne les touche pas, sauf pour appliquer une règle ci-dessus.
# Idempotent. Usage : scripts/sync-project.sh [--dry-run]
set -euo pipefail
REPO="${REPO:-Inprogress-Agency/widoo-app}"; OWNER="${REPO%%/*}"; TITLE="${PROJECT_TITLE:-Widoo — MVP}"
DRY="${1:-}"
run() { if [ "$DRY" = "--dry-run" ]; then echo "+ $*"; else "$@"; fi; }

pnum=$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title == \"$TITLE\") | .number" | head -1)
[ -n "$pnum" ] || { echo "Project « $TITLE » introuvable chez $OWNER" >&2; exit 1; }
pid=$(gh project view "$pnum" --owner "$OWNER" --format json --jq '.id')
fields=$(gh project field-list "$pnum" --owner "$OWNER" --format json)
fid=$(jq -r '.fields[] | select(.name == "Status") | .id' <<<"$fields")
opt() { jq -r --arg n "$1" '.fields[] | select(.name == "Status") | .options[] | select(.name == $n) | .id' <<<"$fields"; }
for s in "Prêts" "Cadrage" "Terminés"; do [ -n "$(opt "$s")" ] || { echo "option Status « $s » absente du Project" >&2; exit 1; }; done

# Statut cible par issue, d'après GitHub Issues (état + labels)
targets=$(gh issue list -R "$REPO" --state all --limit 500 --json number,state,labels --jq '
  .[] | (.labels | map(.name)) as $l
  | if .state == "CLOSED" and ($l | index("type:design")) then "\(.number)\tTerminés"
    elif .state == "OPEN" and ($l | index("status:ready")) then "\(.number)\tPrêts"
    elif .state == "OPEN" and ($l | index("needs-design")) then "\(.number)\tCadrage"
    else empty end')

items=$(gh project item-list "$pnum" --owner "$OWNER" --limit 500 --format json)
changed=0; same=0
while IFS=$'\t' read -r num target; do
  [ -n "$num" ] || continue
  read -r item current <<<"$(jq -r --argjson n "$num" '.items[] | select(.content.number == $n) | "\(.id) \(.status // "-")"' <<<"$items" | head -1)"
  [ -n "${item:-}" ] || { echo "  #$num : absent du Project (le workflow Auto-add l'ajoutera)"; continue; }
  if [ "$current" = "$target" ]; then same=$((same+1)); continue; fi
  run gh project item-edit --project-id "$pid" --id "$item" --field-id "$fid" --single-select-option-id "$(opt "$target")" >/dev/null
  echo "  #$num : $current → $target"; changed=$((changed+1))
done <<<"$targets"
echo "sync-project : $changed modifié(s), $same déjà conforme(s)"
