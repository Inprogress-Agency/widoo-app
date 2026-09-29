// Texts of the site in French, the reference language: `en.ts` must have the same keys.
// Non-breaking space (\u00a0) before « : ? ! » and inside durations and prices (E-21).
export const fr = {
  meta: {
    home: {
      title: 'Que faire à Paris\u00a0? Idées de sortie et balades | Widoo',
      description:
        'Des idées de sortie à Paris prêtes à vivre\u00a0: balades, sorties en amoureux, en famille ou gratuites, avec durée, budget et horaires. App gratuite.',
    },
    notFound: {
      title: 'Page introuvable | Widoo',
    },
  },
  home: {
    title: 'Que faire à Paris aujourd’hui\u00a0?',
    tagline:
      'Des idées de sortie à Paris, prêtes à vivre\u00a0: les étapes, la durée, le budget et les horaires.',
  },
  notFound: {
    title: 'Cette page n’existe pas',
    body: 'Le lien est peut-être incomplet, ou la page a été déplacée.',
    home: 'Retour à l’accueil',
  },
  error: {
    title: 'Une erreur est survenue',
    body: 'La page n’a pas pu s’afficher. Réessayez dans un instant.',
    retry: 'Réessayer',
  },
  structuredData: {
    appDescription:
      'Des sorties toutes prêtes à Paris\u00a0: les étapes, la durée, le budget et les horaires.',
  },
} as const;

type Strings<T> = { readonly [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

/** Shape of the texts of one language: the keys of the French texts, any string as value. */
export type Messages = Strings<typeof fr>;
