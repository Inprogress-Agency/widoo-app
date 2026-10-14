#!/usr/bin/env bash
# Test hors ligne des options des scripts de process : -h et --help affichent l'aide et sortent en 0,
# un argument inconnu affiche l'aide sur la sortie d'erreur et sort en 2, sans jamais appeler gh
# ni git (simulés : chaque appel est consigné, puis échoue).
# Usage : scripts/script-options.test.sh
set -euo pipefail
cd "$(dirname "$0")"

fail=0
check() { # $1 = cas, $2 = obtenu, $3 = attendu
  if [ "$2" = "$3" ]; then echo "ok     $1"; else echo "ÉCHEC  $1 : obtenu « $2 », attendu « $3 »"; fail=1; fi
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/bin"
for cmd in gh git; do
  printf '#!/bin/sh\necho "%s $*" >>"%s/calls"\nexit 1\n' "$cmd" "$tmp" >"$tmp/bin/$cmd"
  chmod +x "$tmp/bin/$cmd"
done

# $1 = script, $2… = arguments. Résultat : « code lignes-stdout lignes-stderr appels Usage-stdout Usage-stderr ».
run() {
  local script=$1 code=0; shift
  : >"$tmp/calls"
  PATH="$tmp/bin:$PATH" REPO=Org/repo DRY_RUN="" GITHUB_STEP_SUMMARY="" \
    "$BASH" "./$script" "$@" >"$tmp/out" 2>"$tmp/err" </dev/null || code=$?
  echo "$code $( [ -s "$tmp/out" ] && echo out || echo - ) $( [ -s "$tmp/err" ] && echo err || echo - )" \
    "$(wc -l <"$tmp/calls" | tr -d ' ') $(grep -c Usage "$tmp/out") $(grep -c Usage "$tmp/err")"
}

for script in sync-status-labels.sh sync-project.sh bootstrap-design-issues.sh validate-design.sh; do
  echo "$script"
  check "--help : aide sur stdout, code 0, aucun appel" "$(run "$script" --help)" "0 out - 0 1 0"
  check "-h : aide sur stdout, code 0, aucun appel" "$(run "$script" -h)" "0 out - 0 1 0"
  check "--foo : aide sur stderr, code 2, aucun appel" "$(run "$script" --foo)" "2 - err 0 0 1"
  check "--dryrun (faute de frappe) : refusé, aucun appel" "$(run "$script" --dryrun)" "2 - err 0 0 1"
done

# Scripts sans argument positionnel : un argument de trop, même derrière --dry-run, est refusé.
for script in sync-status-labels.sh sync-project.sh bootstrap-design-issues.sh; do
  echo "$script — arguments en trop"
  check "x : refusé, aucun appel" "$(run "$script" x)" "2 - err 0 0 1"
  check "--dry-run --foo : refusé, aucun appel" "$(run "$script" --dry-run --foo)" "2 - err 0 0 1"
done

if [ "$fail" = 0 ]; then echo "script-options.test : tout est vert"; else echo "script-options.test : échec"; exit 1; fi
