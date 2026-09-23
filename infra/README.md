# Infrastructure

API de staging sur Google Cloud ([#24](https://github.com/Inprogress-Agency/widoo-app/issues/24)) : image Docker, scripts `gcloud`, workflow de déploiement. Staging et production sont séparés (`SECURITY.md`) : les scripts visent le projet `widoo-staging`. La production pourra les réutiliser sur un autre projet (`PROJECT_ID=… ENVIRONMENT=production`), sur décision d'Ilan.

| Fichier | Rôle |
|---|---|
| `api.Dockerfile` | image de l'API (serveur et `dist/migrate.js`), image de base épinglée par digest |
| `gcp/common.sh` | réglages (projet, région, noms des ressources) et fonctions communes |
| `gcp/1-foundation.sh` | API Google, Artifact Registry, comptes de service, Workload Identity Federation |
| `gcp/2-database.sh` | réseau, Cloud SQL, base, utilisateur, secrets |
| `gcp/3-run.sh` | service Cloud Run `widoo-api` et job de migration `widoo-api-migrate` |
| `gcp/artifact-cleanup.json` | nettoyage des images : les 10 plus récentes gardées, les autres supprimées après 30 jours |

## Pourquoi des scripts `gcloud` plutôt que Terraform

Pour une quinzaine de ressources, un environnement et deux personnes, Terraform imposerait un état distant à amorcer (bucket, verrou), un outil de plus et un `plan` à relire à chaque changement. Les scripts sont idempotents : relancés, ils créent ce qui manque et laissent le reste, sauf la condition WIF et la configuration Cloud Run qu'ils réalignent. Limite assumée : ils ne voient pas une modification faite à la main dans la console. Toute modification passe donc par le script, puis par une PR. Terraform redeviendra pertinent avec la production.

## Prérequis

- Projet `widoo-staging` avec facturation active et Firebase ajouté au projet. Sinon, préfixer chaque script par `FIREBASE_PROJECT_ID=<projet Firebase de staging>`.
- Rôle Owner sur le projet : les scripts créent des comptes de service, des droits IAM et le réseau.
- `gcloud` authentifié (`gcloud auth login`), `openssl`, `curl` et bash (celui de macOS convient), ou Cloud Shell.

## Mise en place

Chaque script annonce la cible (projet, région, compte `gcloud` actif), l'effet et le retour arrière, puis demande confirmation (`--yes` pour ne pas demander). `--dry-run` affiche toutes les commandes sans rien exécuter et sans appeler `gcloud` : le lancer d'abord.

```bash
cd infra/gcp
./1-foundation.sh --dry-run
./1-foundation.sh          # 2 minutes environ
./2-database.sh --dry-run
./2-database.sh            # 15 minutes environ : création de Cloud SQL
# Facultatif, avant l'étape 3 : DSN du projet Sentry de l'API (région UE), saisi sans écho
read -rs dsn && printf '%s' "$dsn" | gcloud secrets versions add sentry-dsn --data-file=- --project=widoo-staging
./3-run.sh --dry-run
./3-run.sh                 # 2 minutes environ
```

Sans valeur dans `sentry-dsn`, le service démarre sans envoyer de rapports d'erreur. Relancer `3-run.sh` une fois le DSN ajouté.

Si une commande échoue juste après une création, c'est la propagation IAM (jusqu'à une minute) : relancer le même script.

## Base de données

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Instance | `widoo-db`, Postgres 16, édition Enterprise, `db-f1-micro`, zonale | instance minimale ; Enterprise explicite car Postgres 16 passe sinon en Enterprise Plus, sans palier partagé |
| Réseau | IP privée seule dans `widoo-vpc` (accès privé aux services), TLS obligatoire | aucune exposition publique ; l'API s'y connecte avec `sslmode=require` |
| Sauvegardes | quotidiennes à 01:00 UTC, 7 gardées, PITR 7 jours, protection contre la suppression | SECURITY.md ; permet de tester la restauration avant le lancement |
| Utilisateur | `widoo`, membre de `cloudsqlsuperuser` | crée les extensions `postgis` et `pg_trgm` de la première migration ; `postgres` reste sans mot de passe |
| `DATABASE_URL` | secret `database-url`, écrit par `2-database.sh` | mot de passe aléatoire, transmis par descripteur de fichier : ni affiché, ni en argument de commande |

Le service et le job partagent l'utilisateur `widoo`. Avant la production, séparer un rôle d'exécution sans droit de DDL du rôle de migration.

`db-f1-micro` accepte 25 connexions : 2 instances au plus × 10 connexions du pool + 1 pour le job. Si staging sature : `gcloud sql instances patch widoo-db --tier=db-g1-small` (50 connexions, 30 € par mois environ, redémarrage de quelques minutes).

Rotation du mot de passe : désactiver la version active de `database-url` (`gcloud secrets versions disable`), relancer `2-database.sh`, puis redéployer.

## Cloud Run

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Accès | public (`allUsers` invoker) ; routes privées protégées par les jetons Firebase | l'app appelle l'API sans identité Google |
| Réseau | sortie VPC directe sur `widoo-run`, trafic privé seulement | joint Cloud SQL sans connecteur Serverless VPC Access (deux VM au minimum, 10 € par mois environ) ; Firebase et Sentry sortent par Internet sans Cloud NAT |
| Sondes | démarrage TCP sur 8080, pas de sonde de vivacité | `/v1/health` répond 503 quand la base tombe : une sonde HTTP ferait redémarrer les instances en boucle |
| Instances | 0 à 2, 1 vCPU, 512 Mio, `cpu-boost` | scale à zéro ; plafond de coût et de connexions |
| `FIREBASE_PROJECT_ID` | `widoo-staging` | obligatoire au démarrage ; jetons du projet Firebase de staging seulement |
| `SENTRY_ENVIRONMENT` | `staging` | sinon `NODE_ENV`, qui vaut `production` dans l'image |
| `TRUST_PROXY` | `linklocal` | adresse du frontal Cloud Run, à confirmer au premier déploiement |
| `CORS_ORIGINS` | vide | pas d'admin web en staging pour l'instant |
| Secrets | `DATABASE_URL`, `SENTRY_DSN` depuis Secret Manager | jamais en clair dans la configuration |

Le job `widoo-api-migrate` lance `node --enable-source-maps dist/migrate.js` sur la même image, dans le même réseau, sans nouvelle tentative et avec 10 minutes au plus.

Les deux ressources sont créées avec les images d'exemple de Google (`hello`, `job`). Le premier run du workflow les remplace par l'image de l'API. Relancé, `3-run.sh` met à jour la configuration et garde l'image déployée ; chaque mise à jour crée une révision.

Pas de secret Mapbox serveur : l'API n'appelle pas encore Mapbox. Le secret sera créé avec le ticket qui appellera Directions ou Geocoding depuis l'API. Pas de clé Firebase non plus (voir Droits).

## Droits (IAM)

Aucun rôle au niveau du projet, aucune clé de compte de service : chaque rôle porte sur une seule ressource.

| Compte | Rôle | Sur | Pour |
|---|---|---|---|
| `widoo-api-run` (service) | Secret Manager Secret Accessor | secrets `database-url`, `sentry-dsn` | lire sa configuration |
| `widoo-api-migrate` (job) | Secret Manager Secret Accessor | secret `database-url` | appliquer les migrations |
| `widoo-deployer` (GitHub) | Artifact Registry Writer | dépôt `widoo` | pousser l'image |
| | Cloud Run Developer | service `widoo-api`, job `widoo-api-migrate` | déployer, lancer la migration |
| | Service Account User | comptes `widoo-api-run`, `widoo-api-migrate` | déployer sous leur identité |
| GitHub (fédération) | Workload Identity User | compte `widoo-deployer` | voir ci-dessous |

La fédération n'accepte que le jeton OIDC d'un run qui remplit les quatre conditions : dépôt n° `1379731427` (identifiant immuable de `Inprogress-Agency/widoo-app`), ref `refs/heads/main`, environnement GitHub `staging`, workflow `.github/workflows/deploy-staging.yml` de `main`. Une PR, une autre branche ou un fork n'obtient rien.

Firebase : l'API vérifie les jetons avec les clés publiques de Google. Aucun rôle ni clé Firebase n'est donc nécessaire, seulement `FIREBASE_PROJECT_ID`.

## Coûts

Ordre de grandeur mensuel en `europe-west9`, à confirmer dans le simulateur de prix Google :

| Poste | Estimation |
|---|---|
| Cloud SQL `db-f1-micro`, zonal | 10 € environ |
| Stockage SSD 10 Go, sauvegardes 7 jours, journaux PITR | 3 € environ |
| Cloud Run (scale à zéro, quota gratuit) | 0 à 2 € |
| Artifact Registry (10 images au plus, 2 Go environ) | moins de 0,50 € |
| Secret Manager, fédération d'identité, réseau VPC | 0 € environ |
| **Total** | **13 à 16 € environ** |
