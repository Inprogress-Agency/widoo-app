#!/usr/bin/env bash
# Contrôle MANAGER en début de session. Liste (sortie non vide = à corriger) :
#  - un ticket status:ready qui cite un écran (E-xx / A-xx) sans ligne « Maquette : » ;
#  - un ticket status:ready encore bloqué par un ticket ouvert ;
#  - un ticket needs-design dont tous les tickets bloquants sont fermés (à passer status:ready).
# Usage : scripts/check-design-links.sh
set -euo pipefail
REPO="${REPO:-Inprogress-Agency/widoo-app}"
fail=0
blockers() { gh api "repos/$REPO/issues/$1/dependencies/blocked_by" --jq "[.[] | select(.state == \"$2\") | \"#\\(.number)\"] | join(\", \")" 2>/dev/null || true; }

while IFS=$'\t' read -r num title has_screen has_mockup; do
  if [ "$has_screen" = "true" ] && [ "$has_mockup" != "true" ]; then
    echo "#$num sans ligne « Maquette : » — $title"; fail=1
  fi
  open=$(blockers "$num" open)
  if [ -n "$open" ]; then echo "#$num prêt mais bloqué par $open — $title"; fail=1; fi
done < <(gh issue list -R "$REPO" --label status:ready --state open --limit 200 --json number,title,body \
  --jq '.[] | [.number, .title, (.body | test("\\b[EA]-[0-9]{2}\\b")), (.body | test("(?m)^Maquette :"))] | @tsv')

while IFS=$'\t' read -r num title; do
  open=$(blockers "$num" open); closed=$(blockers "$num" closed)
  if [ -z "$open" ] && [ -n "$closed" ]; then echo "#$num needs-design mais son ticket design $closed est fermé — $title"; fail=1; fi
done < <(gh issue list -R "$REPO" --label needs-design --state open --limit 200 --json number,title --jq '.[] | [.number, .title] | @tsv')
exit $fail
