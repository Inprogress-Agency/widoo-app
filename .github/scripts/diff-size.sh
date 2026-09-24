#!/usr/bin/env bash
# Check « Diff size » (pr-policy.yml) : lignes utiles de chaque commit de la PR, puis total.
#
# Usage : .github/scripts/diff-size.sh <base> <head>
#   <base>   pointe de la branche de base de la PR (github.event.pull_request.base.sha)
#   <head>   tête de la PR (github.event.pull_request.head.sha)
#   PR_BODY  corps de la PR, lu dans l'environnement ; une ligne « Taille : » remplie,
#            hors commentaires HTML, justifie un commit de plus de TARGET lignes.
#
# CLAUDE.md › CODE : la PR est fusionnée en rebase and merge, chaque commit arrive tel quel sur main.
# Le plafond porte donc sur chaque commit ; le total de la PR est affiché, sans plafond.
# Seuls les commits propres à la PR comptent (<base>..<head>, hors merges), et le total
# part du point de divergence (<base>...<head>) : si la base a avancé depuis la création
# de la branche, ses nouveaux commits ne sont pas comptés à l'envers.
set -euo pipefail

readonly TARGET=400
readonly MAX=500
# Lockfile, snapshots, fichiers générés et images ne comptent pas.
readonly EXCLUDES=(':!pnpm-lock.yaml' ':!**/*.snap' ':!**/generated/**' ':!**/*.svg' ':!**/*.png')

if [ "$#" -ne 2 ]; then
  echo "Usage : $0 <base> <head>" >&2
  exit 2
fi
base=$1
head=$2

if [ "$(git rev-parse --is-shallow-repository)" = true ]; then
  echo "::error::Clone superficiel : l'historique complet est nécessaire (checkout avec fetch-depth: 0)."
  exit 2
fi
for rev in "$base" "$head"; do
  git rev-parse --verify --quiet "$rev^{commit}" > /dev/null \
    || { echo "::error::Commit introuvable : $rev"; exit 2; }
done

# Lignes ajoutées plus supprimées d'un diff ; un fichier binaire compte 0.
useful_lines() {
  git diff --numstat "$@" -- . "${EXCLUDES[@]}" | awk '{ n += $1 + $2 } END { print n + 0 }'
}

commits=$(git rev-list --no-merges --reverse "$base..$head")
if [ -z "$commits" ]; then
  echo "::notice::Aucun commit à mesurer : la PR n'a pas de commit propre hors merges."
  exit 0
fi

# Le commentaire du modèle sur la ligne « Taille : » ne vaut pas justification.
body=$(printf '%s' "${PR_BODY:-}" | perl -0777 -pe 's/<!--.*?-->//gs')
justified=false
if grep -qE '^Taille *:.*[A-Za-z]' <<< "$body"; then
  justified=true
fi

empty_tree=$(git hash-object -t tree /dev/null)
fail=0
echo "Lignes utiles par commit (hors lockfile, snapshots, fichiers générés, SVG et PNG) :"
while read -r sha; do
  parent=$(git rev-parse --verify --quiet "$sha^" || echo "$empty_tree")
  lines=$(useful_lines "$parent" "$sha")
  short=$(git rev-parse --short "$sha")
  # Titre non fiable : caractères de contrôle retirés avant affichage.
  title=$(git log -1 --format=%s "$sha" | tr -d '\000-\037\177')
  printf '  %s %s : %s lignes utiles\n' "$short" "$title" "$lines"
  if [ "$lines" -gt "$MAX" ]; then
    echo "::error::Commit $short « $title » : $lines lignes utiles, plafond $MAX. Redécouper le commit."
    fail=1
  elif [ "$lines" -gt "$TARGET" ] && [ "$justified" = false ]; then
    echo "::error::Commit $short « $title » : $lines lignes utiles (> $TARGET) sans ligne « Taille : » remplie dans le corps de la PR. Redécouper le commit, ou justifier sa taille sur cette ligne."
    fail=1
  fi
done <<< "$commits"

echo "Useful diff: $(useful_lines "$base...$head") lines (total de la PR, sans plafond)"
exit "$fail"
