# Widoo

Application mobile de parcours urbains clé en main. Paris d'abord.

- **Spécification** : le [wiki](https://github.com/Inprogress-Agency/widoo-app/wiki) est le cahier des charges.
- **Tickets** : les issues, organisées par milestones `v0.1` à `v1.0`.
- **Méthode** : [CLAUDE.md](CLAUDE.md) (modes de travail, consignes de sécurité) ; [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité.

## Structure

```
apps/mobile          Expo + expo-router
apps/api             Fastify + Drizzle + PostGIS
apps/admin           React + Vite (modération)
packages/shared      schémas Zod, types, taxonomies, libellés
packages/orchestration  moteur de cohérence des parcours
packages/api-client  client typé
infra                déploiement GCP
```

## Démarrer

Prérequis : Node 22 (`.nvmrc`), Docker. pnpm est fourni par corepack à la version fixée dans `package.json`.

```bash
nvm use && corepack enable
pnpm install
docker compose up -d                  # Postgres 16 + PostGIS sur localhost:5432
cp apps/api/.env.example apps/api/.env
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

La configuration TypeScript, ESLint, Prettier et Vitest vit à la racine et chaque workspace en hérite. L'app Expo (`pnpm --filter mobile start`) et les scripts de base (`db:migrate`, `db:seed`) arrivent avec leurs tickets.

Langues : code et commits en anglais ; wiki, issues et interface en français.

## API

Variables d'environnement décrites et validées au démarrage : `apps/api/.env.example`.

```bash
pnpm --filter api dev                 # http://localhost:8080/v1/health, OpenAPI sur /docs (hors production)
pnpm --filter api build && pnpm --filter api start
docker build -f infra/api.Dockerfile -t widoo-api .
docker run --rm -p 8080:8080 -e DATABASE_URL=postgres://widoo:widoo@host.docker.internal:5432/widoo widoo-api
```

Cloud Run tourne en `linux/amd64` : ajouter `--platform linux/amd64` au build sur Apple Silicon.
