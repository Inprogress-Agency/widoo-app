#!/usr/bin/env bash
# Check « Title, body, issue link » (pr-policy.yml) : titre et corps de la PR selon le modèle.
#
# Usage : .github/scripts/pr-policy.sh
#   TITLE   titre de la PR (github.event.pull_request.title)
#   BODY    corps de la PR (github.event.pull_request.body)
#   AUTHOR  auteur de la PR (github.event.pull_request.user.login)
#
# PR de Dependabot (#555) : l'auteur dependabot[bot] est le compte de l'application GitHub, qu'aucun
# compte humain ne peut prendre (un login humain n'admet pas de crochet) ; le nom de branche, lui, se
# choisit librement et ne sert pas. Son titre doit suivre le format, grâce au préfixe de
# .github/dependabot.yml, mais peut dépasser 72 caractères (nom de paquet long). Son corps n'est
# pas contrôlé : Dependabot ne remplit pas le modèle, ne connaît ni ticket ni niveau de risque.
# Le diff (« Diff size »), le lint, les types, les tests et l'audit restent bloquants (ci.yml).
set -euo pipefail

readonly TITLE_FORMAT='^(feat|fix|chore|polish|test|docs)\((mobile|api|admin|orchestration|shared|tokens|infra|process)\): .{3,}$'
readonly TITLE_MAX=72
readonly BOT='dependabot[bot]'

title=${TITLE:-}
author=${AUTHOR:-}
fail=0

if ! printf '%s' "$title" | grep -qE "$TITLE_FORMAT"; then
  echo "::error::Titre attendu : <type>(<scope>): <action>. Types : feat fix chore polish test docs. Scopes : mobile api admin orchestration shared tokens infra process."
  fail=1
fi

if [ "$author" = "$BOT" ]; then
  echo "::notice::PR de $BOT : format du titre contrôlé ; longueur du titre et corps (modèle, lien d'issue, niveau) non exigés."
  exit "$fail"
fi

if [ "${#title}" -gt "$TITLE_MAX" ]; then
  echo "::error::Titre de ${#title} caractères, maximum $TITLE_MAX."
  fail=1
fi

# Les commentaires HTML du modèle sont invisibles : un lien ou un niveau qui n'y
# figure qu'en commentaire ne compte pas.
body=$(printf '%s' "${BODY:-}" | perl -0777 -pe 's/<!--.*?-->//gs')
for section in '## Résultat et problème' '## Comment vérifier' '## Risque' '## Retour arrière'; do
  grep -qF "$section" <<< "$body" || { echo "::error::Section manquante : $section"; fail=1; }
done
grep -qE '(Fixes|Closes|Refs) #[0-9]+' <<< "$body" || { echo "::error::Lien d'issue manquant (Fixes #N, ou Refs #N pour une PR de process sans ticket à fermer)."; fail=1; }
grep -qE '^Niveau *: *[123]' <<< "$body" || { echo "::error::Niveau de risque manquant (Niveau : 1, 2 ou 3)."; fail=1; }
grep -qE '^Formatage mécanique *: *(oui|non)' <<< "$body" || { echo "::error::Ligne « Formatage mécanique : oui|non » manquante."; fail=1; }
exit "$fail"
