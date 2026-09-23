# Widoo

Application mobile de parcours urbains clé en main. Paris d'abord.

- **Spécification** : le [wiki](https://github.com/Inprogress-Agency/widoo-app/wiki) est le cahier des charges.
- **Tickets** : les issues, organisées par milestones `v0.1` à `v1.0`.
- **Méthode** : [CLAUDE.md](CLAUDE.md) (modes de travail, consignes de sécurité), [docs/decisions.md](docs/decisions.md) ; [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité.

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

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:migrate && pnpm --filter api db:seed
pnpm dev
pnpm --filter mobile start
```

Langues : code et commits en anglais ; wiki, issues et interface en français.
