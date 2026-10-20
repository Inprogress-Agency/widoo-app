#!/usr/bin/env bash
# Test hors ligne de pr-policy.sh : chaque cas lance le script comme en CI (TITLE, BODY, AUTHOR)
# et compare son code de sortie. Ni réseau ni gh. Usage : .github/scripts/pr-policy.test.sh
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/pr-policy.sh"

valid_body='## Résultat et problème

Fixes #555

## Comment vérifier

Formatage mécanique : non

## Risque

Niveau : 2

## Retour arrière

Revert.'
# Corps d'une PR de groupe de Dependabot : ni modèle, ni lien d'issue, ni niveau. Les accents graves sont du texte.
# shellcheck disable=SC2016
bot_body='Bumps the minor-and-patch group with 35 updates:

| Package | From | To |
| --- | --- | --- |
| [zod](https://github.com/colinhacks/zod) | `4.6.5` | `4.6.7` |'
long_title="chore(infra): Bump @tanstack/query-sync-storage-persister from 5.103.2 to 5.104.3"

fail=0
# $1 = cas, $2 = code de sortie attendu, $3 = titre, $4 = auteur, $5 = corps
check() {
  local code=0 out
  out=$(TITLE="$3" AUTHOR="$4" BODY="$5" bash "$script" 2>&1) || code=$?
  if [ "$code" = "$2" ]; then echo "ok     $1"; else echo "ÉCHEC  $1 : sortie $code, attendu $2"; echo "$out"; fail=1; fi
}

check 'PR conforme' 0 'chore(process): exempter Dependabot du modèle' PaulThiberville "$valid_body"
check 'titre hors format' 1 'Bump zod' PaulThiberville "$valid_body"
check 'titre de plus de 72 caractères' 1 "$long_title" PaulThiberville "$valid_body"
check 'corps sans lien d issue' 1 'chore(process): sans lien' PaulThiberville "${valid_body/Fixes #555/}"
check 'niveau en commentaire seul' 1 'chore(process): niveau caché' PaulThiberville "${valid_body/Niveau : 2/<!-- Niveau : 2 -->}"
check 'Dependabot, groupe de mineures' 0 'chore(infra): Bump the minor-and-patch group with 35 updates' 'dependabot[bot]' "$bot_body"
check 'Dependabot, titre de plus de 72 caractères' 0 "$long_title" 'dependabot[bot]' "$bot_body"
check 'Dependabot, titre sans préfixe' 1 'chore(deps): Bump zod from 4.6.5 to 4.6.7' 'dependabot[bot]' "$bot_body"
check 'Dependabot, titre hors format' 1 'Bump zod from 4.6.5 to 4.6.7' 'dependabot[bot]' "$bot_body"
check 'auteur proche de Dependabot' 1 'chore(infra): Bump zod from 4.6.5 to 4.6.7' dependabot "$bot_body"
check 'auteur qui contient dependabot[bot]' 1 'chore(infra): Bump zod from 4.6.5 to 4.6.7' 'x-dependabot[bot]' "$bot_body"
check 'auteur vide' 1 'chore(infra): Bump zod from 4.6.5 to 4.6.7' '' "$bot_body"
exit "$fail"
