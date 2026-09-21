#!/usr/bin/env bash
# Une fois : crée le label type:design, les tickets design du MVP, et déclare
# les tickets dev concernés bloqués par eux (needs-design posé, status:ready retiré).
# Idempotent sur les titres. Usage : scripts/bootstrap-design-issues.sh [--dry-run]
set -euo pipefail
REPO="${REPO:-Inprogress-Agency/widoo-app}"; DRY="${1:-}"
W="https://github.com/Inprogress-Agency/widoo-app/wiki"
run() { if [ "$DRY" = "--dry-run" ]; then echo "+ $*"; else "$@"; fi; }

gh label list -R "$REPO" --limit 200 --json name --jq '.[].name' | grep -qx type:design \
  || run gh label create type:design -R "$REPO" --color "D876E3" --description "Planche Claude Design à produire et valider"

num_of() { gh issue list -R "$REPO" --state all --limit 500 --search "\"$1\" in:title" --json number,title --jq ".[] | select(.title == \"$1\") | .number" | head -1; }
id_of()  { gh api "repos/$REPO/issues/$1" --jq .id; }

# key|milestone|title|écrans|titres exacts des tickets dev débloqués (séparés par ;;)
DESIGN=(
"e01|v0.2|Design — E-01 et E-04 accueil carte, vue liste et cards de parcours|E-01, E-04|Afficher la carte Mapbox stylée avec les marqueurs de parcours (E-01);;Ajouter « Rechercher dans cette zone » et le cycle de recherche par bbox;;Construire la bottom sheet de résultats et les cartes de parcours (E-04);;Ajouter la vue liste et la bascule carte / liste sur l'accueil (E-01)"
"e02|v0.2|Design — E-02 et E-03 recherche géographique, filtres et bandeau météo|E-02, E-03|Implémenter les chips rapides et le panneau de filtres complet (E-03);;Ajouter la recherche géographique avec proxy de géocodage (E-02);;Afficher le bandeau météo contextuel sur l'accueil"
"e05|v0.3|Design — E-05 fiche parcours|E-05|Construire la fiche parcours (E-05)"
"e09|v0.3|Design — E-09, E-10 et E-16 connexion, profil et profil public|E-09, E-10, E-16|Implémenter la connexion (E-10), le profil (E-09) et la suppression de compte;;Afficher le profil public de créateur (E-16)"
"e06|v0.4|Design — E-06 et E-08 programmer et mes parcours|E-06, E-08|Construire l'écran Programmer (E-06);;Construire Mes parcours : À venir, Enregistrés, Passés (E-08)"
"e07|v0.4|Design — E-07 et E-15 journée en cours et fin de parcours|E-07, E-15|Construire la journée en cours et le lien Google Maps (E-07);;Noter un parcours en fin de sortie (E-15) et afficher les avis"
"e17|v0.4|Design — E-17 écran Premium|E-17|Brancher RevenueCat et construire l'écran Premium (E-17)"
"e11|v0.5|Design — E-11 à E-14 éditeur de parcours et lieux|E-11, E-12, E-13, E-14|Construire l'éditeur de parcours : informations et étapes (E-11, E-12, E-14);;Rechercher et créer un lieu avec géocodage et détection de doublons (E-13)"
"ver|v0.5|Design — vérification communautaire : blocs, bandeaux d'alerte et signalement|E-05, E-07, E-15|Afficher et saisir la vérification des lieux dans la fiche et la journée en cours"
"adm|v0.6|Design — A-01 à A-05 admin web|A-01, A-02, A-03, A-04, A-05|Créer l'app admin : socle React/Vite et connexion (A-01);;Construire la file de modération et ses endpoints (A-02);;Construire la gestion des signalements (A-03);;Construire l'édition des lieux et parcours, l'import CSV et le tableau de bord (A-04, A-05)"
)

for row in "${DESIGN[@]}"; do
  IFS='|' read -r key ms title screens devs <<<"$row"
  dev_nums=(); IFS=';;' read -ra titles <<<"$devs"
  for dt in "${titles[@]}"; do [ -z "$dt" ] && continue; n=$(num_of "$dt"); [ -n "$n" ] && dev_nums+=("$n") || echo "  avertissement : ticket dev introuvable « $dt »"; done
  refs=$(printf '#%s ' "${dev_nums[@]}")
  body="## Contexte
[Ecrans]($W/Ecrans) · écrans $screens · design system Widoo (groupe References) · tickets dev débloqués : $refs

## À produire
- [ ] composants et variantes
- [ ] états : vide, chargement, erreur, sans réseau, géolocalisation refusée si carte
- [ ] texte système à 150 % sans troncature des textes essentiels
- [ ] contrastes vérifiés (AA texte, 3:1 composants)
- [ ] libellés lecteur d'écran des contrôles
- [ ] planche nommée avec l'identifiant d'écran

## Validation
Lien de la planche Claude Design : …
Validée par Ilan le : …"
  dn=$(num_of "$title")
  if [ -z "$dn" ]; then
    run gh issue create -R "$REPO" --title "$title" --label "type:design,area:mobile" --milestone "$ms" --body "$body" >/dev/null
    echo "  créé : $title"; [ "$DRY" = "--dry-run" ] && continue; dn=$(num_of "$title")
  else echo "  existe : $title (#$dn)"; fi
  did=$(id_of "$dn")
  for n in "${dev_nums[@]}"; do
    run gh issue edit "$n" -R "$REPO" --add-label needs-design --remove-label status:ready >/dev/null 2>&1 || true
    if ! gh api -X POST "repos/$REPO/issues/$n/dependencies/blocked_by" -F issue_id="$did" >/dev/null 2>&1; then
      echo "  #$n : dépendance API indisponible, ligne texte ajoutée"
      cur=$(gh issue view "$n" -R "$REPO" --json body --jq .body)
      printf '%s' "$cur" | grep -q "Bloqué par #$dn" || run gh issue edit "$n" -R "$REPO" --body "$(printf 'Bloqué par #%s (maquette)\n\n%s' "$dn" "$cur")" >/dev/null
    fi
  done
done
echo "Terminé. Les tickets dev à écran sont needs-design jusqu'à fermeture de leur ticket design."
