# Politique de sécurité — Widoo

## Portée

Widoo est une application mobile grand public avec des comptes utilisateurs, du contenu créé par la communauté et des données de sortie (favoris, programmations, historique). Stack : Expo / React Native, API Fastify sur Cloud Run, PostgreSQL + PostGIS sur Cloud SQL, Firebase Auth, Google Cloud Storage. Les exigences produit sont dans la page wiki `Securite-et-RGPD` ; ce fichier régit le travail sur le code.

Actifs prioritaires : la base (comptes, historique), les médias, l'intégrité du catalogue de lieux, la disponibilité de la recherche, les clés des services tiers facturables.

Les entrées de l'app, des URL, des fichiers uploadés et des textes libres sont non fiables.

## Propriétés obligatoires

- Jeton Firebase vérifié et rôle relu en base avant toute écriture ; contrôle d'accès par ressource.
- Aucun secret, jeton, cookie, e-mail, nom, photo réelle ou autre donnée personnelle dans Git, l'app, les tests, les prompts, rapports, transcriptions ou sorties de commande. Logs structurés sans donnée personnelle.
- Validation Zod de toute entrée et sortie ; requêtes paramétrées via Drizzle ; refus par défaut en cas d'échec.
- Staging et production séparés (projets ou instances distincts), données fictives en staging.
- Migrations Drizzle additives, versionnées, testées ; sauvegardes Cloud SQL quotidiennes et PITR ; restauration testée avant lancement.
- Clés tierces publiques restreintes (bundle id, referrer) ; usages facturables (Directions, Geocoding) uniquement depuis l'API avec cache et limitation de débit.
- Upload par URL signée, type et taille vérifiés, réencodage serveur des images (suppression EXIF).
- Toute nouvelle donnée personnelle, table, export ou sous-traitant revient au cadrage : finalité, durée, information de la personne, transfert éventuel, avant tout code.

## Revue OWASP du diff

Référence : OWASP Top 10 (édition courante à la date de la PR ; vérifier à chaque nouvelle édition). Routine de développement, pas un audit. Elle s'applique quand un diff modifie : accès, rôles ou appels sortants ; configuration, en-têtes, CORS ; dépendances, CI, livraison ; authentification, session, cryptographie ; SQL, rendu ou en-têtes issus d'entrées non fiables ; règle métier de sécurité (modération, signaux, quotas) ; intégrité base ou stockage, migration, sauvegarde ; journalisation ; limites, reprise et opérations multi-étapes.

Sortie attendue dans la PR : catégories pertinentes, contrôle concret, test ou raison de non-applicabilité, en quelques lignes. Un changement purement visuel, textuel ou de test ne la déclenche pas.

## Niveaux et contrôles

| Niveau | Changement | Contrôle requis |
|---|---|---|
| 1 — courant | Aucun effet matériel sur sécurité, données, infrastructure ou restauration | Tests et CI |
| 2 — sensible et borné | Effet réel, réversible et circonscrit : migration additive, nouvelle donnée persistée non destructive, configuration, quota, règle de modération, nouveau endpoint authentifié | Revue OWASP ciblée, tests, retour arrière décrit, validation d'Ilan avant production |
| 3 — critique | Risque plausible de perte ou corruption de données, contournement d'accès ou de rôle, fuite de secret ou de données personnelles, migration destructive, changement d'architecture d'auth ou de stockage, nouveau sous-traitant de données personnelles | Staging et tests ; puis, sur le commit figé, revue indépendante proportionnée avant fusion |

L'agent signale clairement un niveau 2 ou 3 dans la PR (label `level:2` / `level:3`) et suspend la fusion au niveau 3. Ilan autorise la suite et peut accepter un risque résiduel documenté dans `docs/decisions.md`.

Une alerte de dépendance bloque si elle est critique ou élevée, ou moyenne avec impact plausible sur l'accès, les secrets ou les données. Une alerte faible devient une dette suivie en issue.

## Production

Une fusion n'autorise pas un déploiement. L'API staging se déploie automatiquement depuis `main` ; la production se déploie par action manuelle d'Ilan ou de Paul, après staging vert. Toute action distante (migration en production, changement de configuration, rotation de secret) annonce cible, effet et retour arrière avant exécution. Un rollback applicatif ne restaure pas une donnée supprimée.

## Signalement

Vulnérabilité constatée : issue privée (`Security advisories` du dépôt) ou message direct à Ilan ; aucun détail exploitable dans une issue publique.
