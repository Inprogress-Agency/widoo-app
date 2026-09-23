# Widoo

Application mobile de parcours urbains clé en main. Paris d'abord.

- **Spécification** : le [wiki](https://github.com/Inprogress-Agency/widoo-app/wiki) est le cahier des charges.
- **Tickets** : les issues, organisées par milestones `v0.1` à `v1.0`.
- **Méthode** : [CLAUDE.md](CLAUDE.md) (modes de travail), [SECURITY.md](SECURITY.md), [docs/decisions.md](docs/decisions.md).

## Structure

```
apps/mobile          Expo + expo-router
apps/api             Fastify + Drizzle + PostGIS
apps/admin           React + Vite (modération)
packages/shared      schémas Zod, types, taxonomies, libellés
packages/orchestration  moteur de cohérence des parcours
packages/api-client  client typé
infra                déploiement GCP
docs                 décisions, plans, procédures
```

## Démarrer

Prérequis : Node 22 (`.nvmrc`), Docker. pnpm est fourni par corepack à la version fixée dans `package.json`.

```bash
nvm use && corepack enable
pnpm install
docker compose up -d                  # Postgres 16 + PostGIS sur localhost:5432
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:migrate          # schéma de la base, requis par les tests de l'API
pnpm lint && pnpm typecheck && pnpm test
pnpm build
```

Port 5432 déjà pris : copier `.env.example` en `.env` à la racine, changer `POSTGRES_PORT` et reporter le port dans `apps/api/.env`. Vérifier PostGIS : `docker compose exec db psql -U widoo -c 'select postgis_version()'`.

| Commande | Effet |
|---|---|
| `pnpm lint` | ESLint dans chaque workspace, puis Prettier en vérification |
| `pnpm typecheck` | TypeScript strict, sans émission |
| `pnpm test` | Vitest (`pnpm test -- --coverage` pour la couverture, comme en CI) |
| `pnpm build` | build des workspaces qui en ont un |
| `pnpm format` | Prettier en écriture |
| `pnpm dev` | serveurs de développement (API et admin, à mesure qu'ils arrivent) |

La configuration TypeScript, ESLint, Prettier et Vitest vit à la racine et chaque workspace en hérite.

Langues : code et commits en anglais ; wiki, issues et interface en français.

## Qualité et CI

Tout changement passe par une PR remplie selon `.github/pull_request_template.md` (règles : [CLAUDE.md](CLAUDE.md), mode CODE). Le ruleset de `main` exige une PR et ces trois checks, et y interdit suppression et force-push :

| Check | Workflow | Vérifie |
|---|---|---|
| `Lint, types, tests` | `ci.yml` | install figé, lint, types, migration de la base de test (PostGIS), tests avec couverture, build API et admin, `pnpm audit` (élevé et critique). Vert sans rien lancer si la PR ne touche que `*.md`, `docs/`, `.claude/`, `.github/` ou `scripts/*.sh` |
| `Title, body, issue link` | `pr-policy.yml` | titre `<type>(<scope>): <action>` de 72 caractères au plus ; sections du modèle, `Fixes #N` (ou `Refs #N`), `Niveau :` et `Formatage mécanique :`, hors commentaires HTML |
| `Diff size` | `pr-policy.yml` | lignes utiles de chaque commit de la PR, hors merges, lockfile, snapshots, fichiers générés, SVG et PNG, puis le total `Useful diff: N lines`, sans plafond ; refus si un commit dépasse 500 lignes, ou 400 sans ligne `Taille :` renseignée. Script : `.github/scripts/diff-size.sh <base> <head>` |

`ci.yml` tourne à chaque push. `pr-policy.yml` tourne aussi quand le titre, le corps ou la base de la PR changent : corriger le corps suffit à relancer ses checks. « Re-run » sur un ancien run relit le corps de l'époque, pas le nouveau.

**Plafond par commit** (D-014). La PR est fusionnée en rebase and merge : chaque commit arrive tel quel sur `main`, et le plafond porte sur chaque commit. Viser moins de 400 lignes utiles par commit ; jusqu'à 500 si la ligne `Taille :` du corps cite le commit, par son titre (son SHA change au rebase), et justifie sa taille ; au-delà, redécouper le commit. La PR affiche son total, sans plafond. Seuls comptent les commits propres à la PR (`base..head`), et le total part du point de divergence avec la base (`base...head`) : les commits arrivés sur la base depuis la création de la branche ne sont pas comptés.

**PR empilées.** Une PR par ticket : on ne découpe pas un ticket en plusieurs PR, et une pile ne relie que des tickets dépendants. Seule `main` est protégée : une PR dont la base est une branche `issue/...` affiche ses checks sans les exiger, et `Fixes #N` ne ferme le ticket qu'à la fusion dans `main`. On ne fusionne donc jamais une PR dans sa base de pile. Ilan ou Paul fusionne la PR du bas de la pile dans `main` en rebase and merge. Sur la branche suivante, on rebase sur `main` : git saute les commits déjà fusionnés à l'identique. Ilan ou Paul pousse la branche rebasée, puis on recible la PR et on attend ses trois checks verts avant de la fusionner à son tour :

```bash
git fetch origin && git rebase origin/main    # sur la branche suivante
git push --force-with-lease                   # Ilan ou Paul
gh pr edit <n° de la PR suivante> --base main
```

## API

Variables d'environnement décrites et validées au démarrage : `apps/api/.env.example`.

```bash
pnpm --filter api dev                 # http://localhost:8080/v1/health, OpenAPI sur /docs (hors production)
pnpm --filter api build && pnpm --filter api start
docker build -f infra/api.Dockerfile -t widoo-api .
docker run --rm -p 8080:8080 -e DATABASE_URL=postgres://widoo:widoo@host.docker.internal:5432/widoo widoo-api
```

Cloud Run tourne en `linux/amd64` : ajouter `--platform linux/amd64` au build sur Apple Silicon.

### Base de données

Schéma unique : `apps/api/src/db/schema.ts` (Drizzle ORM). Migrations versionnées sous `apps/api/src/db/generated/migrations`, écrites par `db:generate` et relues avant commit.

| Commande (`pnpm --filter api …`) | Effet |
|---|---|
| `db:generate --name=add_x` | écrit la migration du dernier changement de `schema.ts` ; `--custom --name=x` crée un fichier SQL à écrire à la main |
| `db:migrate` | applique les migrations en attente, sans effet si la base est à jour (la CI migre la base de test avant les tests) |
| `db:seed` | données fictives : Paris, quelques lieux du Marais et un parcours ; idempotent, refusé en production |
| `db:reset` | vide la base locale (tables, types, extensions, journal des migrations), puis `db:migrate` et `db:seed` ; refusé hors `localhost` et en production |

Dans l'image, `docker run --rm -e DATABASE_URL=… widoo-api node dist/migrate.js` applique les migrations avant un déploiement.

## App mobile

Expo SDK 57, expo-router, `apps/mobile`. L'app appelle l'API locale : la démarrer avec `HOST=0.0.0.0 pnpm --filter api dev` pour qu'un simulateur, un émulateur ou un téléphone du réseau la joigne.

```bash
pnpm --filter mobile ios        # build de développement (Xcode), installé sur le simulateur, puis Metro
pnpm --filter mobile android    # idem sur l'émulateur (Android SDK, JDK 17)
pnpm --filter mobile start      # Metro seul, pour un build de développement déjà installé
pnpm --filter mobile start --go # Expo Go, sans build : modules natifs d'Expo Go seulement
```

En développement, l'URL de l'API est l'adresse de la machine qui sert Metro, port 8080 (`src/api/api-url.ts`) ; `EXPO_PUBLIC_API_URL` dans `apps/mobile/.env.local` la remplace. Un build EAS lit `EXPO_PUBLIC_API_URL` dans les variables de son environnement EAS (`eas.json`). Les dossiers `ios/` et `android/` sont générés (`expo prebuild`) et jamais versionnés.
