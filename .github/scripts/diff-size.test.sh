#!/usr/bin/env bash
# Test hors ligne de diff-size.sh : un dépôt git jetable, un commit par cas, le script lancé
# comme en CI (base, tête, PR_BODY). Ni réseau ni gh. Usage : .github/scripts/diff-size.test.sh
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/diff-size.sh"
repo=$(mktemp -d)
trap 'rm -rf "$repo"' EXIT
cd "$repo"
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com
git init -q -b main
git commit -q --allow-empty -m 'chore: base'
base=$(git rev-parse HEAD)

fail=0
# $1 = cas, $2 = fichier, $3 = lignes, $4 = code de sortie attendu, $5 = corps de PR (facultatif)
check() {
  git checkout -q --detach "$base"
  mkdir -p "$(dirname "$2")"
  seq "$3" > "$2"
  git add "$2"
  git commit -q -m "test: $1"
  local code=0 out
  out=$(PR_BODY="${5:-}" bash "$script" "$base" HEAD 2>&1) || code=$?
  if [ "$code" = "$4" ]; then echo "ok     $1"; else echo "ÉCHEC  $1 : sortie $code, attendu $4"; echo "$out"; fail=1; fi
}

check 'données de seed, 1 000 lignes' apps/api/src/db/seed/routes.json 1000 0
check 'données de seed à la racine' seed/routes.json 1000 0
check 'code, 600 lignes' apps/api/src/routes.ts 600 1
check 'code .ts sous seed/' apps/api/src/db/seed/routes.ts 600 1
check 'code .js sous seed/' apps/api/src/db/seed/routes.js 600 1
check 'JSON dans un sous-dossier de seed/' apps/api/src/db/seed/nested/routes.json 600 1
check 'JSON dans un dossier dont le nom finit par seed' apps/api/src/db/myseed/routes.json 600 1
check 'code, 450 lignes sans ligne Taille' apps/api/src/routes.ts 450 1
check 'code, 450 lignes justifiées' apps/api/src/routes.ts 450 0 'Taille : commit de test, 450 lignes justifiées'
check 'code, 450 lignes, Taille en commentaire seul' apps/api/src/routes.ts 450 1 'Taille : <!-- à renseigner -->'
exit "$fail"
