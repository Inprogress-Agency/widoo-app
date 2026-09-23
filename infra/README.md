# Infrastructure

API de staging sur Google Cloud ([#24](https://github.com/Inprogress-Agency/widoo-app/issues/24)) : image Docker, scripts `gcloud`, workflow de déploiement. Staging et production sont séparés (`SECURITY.md`) : les scripts visent le projet `widoo-staging`. La production pourra les réutiliser sur un autre projet (`PROJECT_ID=… ENVIRONMENT=production`), sur décision d'Ilan.

| Fichier | Rôle |
|---|---|
| `api.Dockerfile` | image de l'API (serveur et `dist/migrate.js`), image de base épinglée par digest |
| `gcp/common.sh` | réglages (projet, région, noms des ressources) et fonctions communes |
| `gcp/1-foundation.sh` | API Google, Artifact Registry, comptes de service, Workload Identity Federation |
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
```

Si une commande échoue juste après une création, c'est la propagation IAM (jusqu'à une minute) : relancer le même script.

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
