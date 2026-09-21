<!-- Titre : <type>(<scope>): <action en français>, moins de 72 caractères.
Types : feat, fix, chore, polish, test, docs. Scopes : mobile, api, admin, orchestration, shared, infra, process.
Objectif sous 400 lignes utiles, plafond 500 justifié. Aucun secret ni donnée personnelle réelle dans le diff ou les preuves. -->

## Résultat et problème

<!-- Le problème concret, le résultat obtenu, les limites restantes. -->

Fixes #<!-- numéro ; ou « Refs #N » pour une PR de process sans ticket à fermer, N = Inbox -->
Écrans : <!-- E-xx / A-xx concernés, ou « aucun » -->
Dépendance : <!-- PR empilée ou « aucune » -->

## Comment vérifier

<!-- Étapes, commandes et résultats. Capture ou vidéo pour un changement visible (données fictives). -->

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verts en local
- [ ] Testé sur iOS / Android (préciser) — si mobile

Formatage mécanique : non

## Risque

Niveau : <!-- 1, 2 ou 3 selon SECURITY.md, avec justification en une ligne. -->

Taille : <!-- À renseigner à partir de 400 lignes utiles. -->

<!-- Revue OWASP en quelques lignes si le diff la déclenche. Nouvelle dépendance : nom, raison, alternative écartée. -->

## Retour arrière

<!-- Revert de la PR suffit ? Migration à annuler ? Donnée créée à conserver ? -->
