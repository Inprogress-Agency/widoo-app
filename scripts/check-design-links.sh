#!/usr/bin/env bash
# Contrôle MANAGER : un ticket dev prêt à coder qui touche un écran doit
# porter une ligne « Maquette : » et n'être bloqué par aucun ticket design ouvert.
# Usage : scripts/check-design-links.sh   (sortie non vide = à corriger)
set -euo pipefail
REPO="${REPO:-Inprogress-Agency/widoo-app}"
fail=0
while IFS=$'\t' read -r num title body; do
  printf '%s' "$body" | grep -qE '\b[EA]-[0-9]{2}\b' || continue
  if ! printf '%s' "$body" | grep -q '^Maquette :'; then
    echo "#$num sans ligne « Maquette : » — $title"; fail=1
  fi
  open_blockers=$(gh api "repos/$REPO/issues/$num/dependencies/blocked_by" --jq '.[] | select(.state=="open") | .number' 2>/dev/null | paste -sd, - || true)
  if [ -n "$open_blockers" ]; then
    echo "#$num prêt mais bloqué par #$open_blockers — $title"; fail=1
  fi
done < <(gh issue list -R "$REPO" --label status:ready --state open --limit 200 --json number,title,body \
          --jq '.[] | [.number, .title, (.body | gsub("\n"; "\\n"))] | @tsv' | sed 's/\\n/\n/g' | awk -F'\t' 'BEGIN{OFS="\t"}{print}')
exit $fail
