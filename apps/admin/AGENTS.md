# Admin web — règles de travail

Outil interne de l'équipe Widoo. Spécification : wiki [Admin-Web](https://github.com/Inprogress-Agency/widoo-app/wiki/Admin-Web) ; écrans de référence : [Ecrans › Admin web](https://github.com/Inprogress-Agency/widoo-app/wiki/Ecrans#admin-web). Les règles communes du dépôt sont dans le `CLAUDE.md` de la racine.

## Architecture des fichiers

| Dossier | Rôle |
|---|---|
| `src/app/` | routes seulement : pages fines ; `(shell)/` regroupe les pages derrière la connexion, `connexion/` est A-01 |
| `src/containers/` | assemblage d'un écran : lit la session et les données par les hooks, passe des props aux composants |
| `src/components/` | composants d'affichage, sans appel réseau ni règle métier : `shell/`, `sign-in/`, `states/` |
| `src/hooks/` | logique d'écran (`useSignIn`, `useSession`, `useMediaQuery`) |
| `src/lib/` | session et fournisseur d'identité (`auth/`), page de retour, en-têtes de réponse |
| `src/config/` | navigation par rôle, variables d'environnement validées |
| `src/messages/` | textes, en français seulement |

Les composants communs (bouton, champ, encadré, menu, info-bulle) et le thème shadcn tiré de `tokens.json` sont dans `packages/ui`.

## Règles

- **Aucune donnée en rendu serveur.** Les pages sont des coques statiques ; tout appel à l'API part du navigateur, par `packages/api-client`, avec le jeton de la personne connectée.
- **L'API décide.** Le rôle est vérifié par l'API à chaque appel ; l'admin ne fait que cacher ce que le rôle ne permet pas (`packages/shared`, `admin-sections.ts`).
- **Aucun texte en dur.** Chaque texte visible vient de `src/messages/fr.ts`.
- **Aucune couleur ni valeur de style en dur.** Classes du preset `@widoo/ui/tailwind-preset` seulement ; pas de valeur arbitraire (`text-[15px]`). Une taille des planches absente de `tokens.json` s'ajoute au preset avec la mention « à reporter dans tokens.json ».
- **Aucune valeur d'environnement en dur.** `src/config/env.ts`, documentées dans `.env.example` ; rien de secret : tout `NEXT_PUBLIC_` part dans le navigateur.
- **Jamais indexé, jamais mis en cache** : en-têtes de `src/lib/response-headers.ts`.
- **Imports** par l'alias `@/`.

## Commandes

```bash
cp apps/admin/.env.example apps/admin/.env.local
pnpm --filter @widoo/admin dev          # http://localhost:5173
pnpm --filter @widoo/admin build && pnpm --filter @widoo/admin start
pnpm --filter @widoo/admin lint && pnpm --filter @widoo/admin typecheck && pnpm --filter @widoo/admin test
```

En local, avec l'émulateur Auth (sans second facteur) et des données fictives à traiter :

```bash
firebase emulators:start --only auth --project demo-widoo   # liens de connexion dans sa sortie
FIREBASE_PROJECT_ID=demo-widoo FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 pnpm --filter api dev
pnpm --filter api db:seed && pnpm --filter api db:seed:recette   # parcours en attente, signalements, support
docker compose exec db psql -U widoo -d widoo -c "update users set role = 'admin' where email = '<adresse>'"
```
