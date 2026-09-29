# Site web — règles de travail

Site de Widoo : landing, page d'un parcours partagé (`/r/`) et pages légales. Architecture et budgets : wiki [Site-Web](https://github.com/Inprogress-Agency/widoo-app/wiki/Site-Web) ; maquette : [E-21](https://github.com/Inprogress-Agency/widoo-app/wiki/Ecrans#e-21--site-widooapp-landing-et-lien-dun-parcours). Les règles communes du dépôt sont dans le `CLAUDE.md` de la racine.

## Architecture des fichiers

| Dossier | Rôle |
|---|---|
| `src/app/[locale]/` | routes seulement : pages fines, métadonnées, `generateStaticParams` |
| `src/app/sitemap.ts`, `src/app/robots.ts` | fichiers pour les moteurs de recherche |
| `src/proxy.ts` | domaine canonique et langue ; la décision est dans `src/lib/routing.ts` |
| `src/containers/` | assemblage d'une page à partir des composants |
| `src/components/` | blocs réutilisables : `sections/` (blocs de la landing), `ui/` (boutons, tuiles…), `seo/` |
| `src/lib/` | seo, JSON-LD, i18n, routage, en-têtes de sécurité ; plus tard api et analytics |
| `src/config/` | langues, variables d'environnement validées (domaine, liens des stores) |
| `src/messages/` | textes : `fr.ts` fait référence, `en.ts` a les mêmes clés (vérifié par le typage et les tests) |

## Règles

- **Composants serveur par défaut.** `'use client'` seulement pour l'interactif (questions dépliables, sélecteur de langue) et les écrans que Next.js rend sans les paramètres de la route (page introuvable, erreur).
- **Aucune requête réseau depuis un composant client.** L'API Widoo n'est appelée que côté serveur.
- **Aucun texte en dur.** Chaque texte visible vient de `src/messages`, lu par clé en notation pointée (`messages.home.title`). Espace insécable (` `) devant « : ? ! » et dans les durées et les prix, aucun tiret long.
- **Aucune couleur ni valeur de style en dur.** Couleurs, espacements, rayons et tailles viennent de `tokens.json` par le preset `@widoo/tokens/tailwind-preset` ; pas de valeur arbitraire (`text-[15px]`).
- **Aucune valeur d'environnement en dur.** Domaine, liens des stores, indexation : `src/config/site.ts`, documentés dans `.env.example`.
- **Aucun cookie**, ni GTM, ni bannière de consentement (décision d'Ilan du 2026-09-28).
- **Imports** par l'alias `@/`.
- **Animations** en CSS et Web Animations seulement, `prefers-reduced-motion` respecté ; pas de GSAP ni de framer-motion.
- **Référencement** : chaque page passe par `buildMetadata` (`src/lib/seo.ts`), qui pose `canonical`, `hreflang` et `noindex` hors production.

## Commandes

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @widoo/web dev          # http://localhost:3000
pnpm --filter @widoo/web build && pnpm --filter @widoo/web start
pnpm --filter @widoo/web lint && pnpm --filter @widoo/web typecheck && pnpm --filter @widoo/web test
```

## Budgets avant fusion

Landing au téléphone (4G simulée) : LCP < 2,5 s, CLS < 0,1, INP < 200 ms, JavaScript envoyé < 100 Ko compressés, Lighthouse ≥ 90 en performance, accessibilité, bonnes pratiques et référencement.
