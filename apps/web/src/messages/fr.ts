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
      title: 'Page introuvable · Widoo',
    },
  },
  header: {
    skip: 'Aller au contenu',
    home: 'Widoo, accueil',
    sections: 'Sections de la page',
    nav: { ideas: 'Idées de sortie', districts: 'Quartiers', questions: 'Questions' },
    download: 'Télécharger l’app',
    language: 'Langue',
  },
  home: {
    title: 'Que faire à Paris aujourd’hui\u00a0?',
    tagline:
      'Des idées de sortie à Paris, prêtes à vivre\u00a0: les étapes, la durée, le budget et les horaires.',
    reviews: 'Avis sur l’app',
    reviewSource: { appStore: 'Avis App Store', googlePlay: 'Avis Google Play' },
    ratingSpoken: 'Noté {rating} sur 5',
    stickerMeta: '{steps} en {duration}',
    qrLabel: 'QR code pour télécharger l’app',
  },
  notFound: {
    title: 'Cette page n’existe pas',
    body: 'L’adresse est peut-être incomplète. Les idées de sortie vous attendent sur l’accueil et dans l’app.',
    ideas: 'Voir les idées de sortie',
  },
  error: {
    title: 'Une erreur est survenue',
    body: 'La page n’a pas pu s’afficher. Réessayez dans un instant.',
    retry: 'Réessayer',
  },
  sharedRoute: {
    heading: 'On vous a partagé ce parcours',
    openInApp: 'Ouvrir dans l’app',
    openInAppHint:
      'Sans l’app, le bouton vous mène au store\u00a0: le parcours s’ouvrira après l’installation.',
    scanHint:
      'Scannez pour l’ouvrir sur votre téléphone. Sans l’app, le parcours s’ouvrira après l’installation.',
    qrLabel: 'QR code du lien de ce parcours',
    photoLabel: 'Photo du parcours {title}',
    byWidoo: 'Par Widoo',
    byMember: 'Par {name}',
    private: 'Privé',
    premium: 'Premium',
    premiumNote:
      'Parcours Premium\u00a0: toutes ses étapes dans l’app, avec un pass, un abonnement ou ce parcours seul.',
    sharedBy: 'Partagé par {name}, visible seulement avec le lien',
    reviews: '({count}\u00a0avis)',
    ratingSpoken: 'Noté {rating} sur 5, {count} avis',
    free: 'Gratuit',
    budgetSpoken: 'environ {amount} par personne',
    steps: { one: '{count}\u00a0étape', other: '{count}\u00a0étapes' },
    tiles: { duration: 'Durée', budget: 'Par pers.', distance: 'Distance', steps: 'Étapes' },
    removedTitle: 'Ce parcours n’est plus disponible',
    removedBody: 'Son créateur l’a retiré le {date}. D’autres parcours vous attendent dans l’app.',
    removedBodyUndated: 'Son créateur l’a retiré. D’autres parcours vous attendent dans l’app.',
    metaTitle: '{title} | Widoo',
    metaDescription: '{details}. Un parcours à ouvrir dans l’app Widoo.',
    previewTagline: 'Des sorties toutes prêtes à Paris',
  },
  plan: {
    walk: '{minutes}\u00a0min à pied',
  },
  // Text alternatives of the official badges (the badges carry their own text).
  stores: {
    appStore: 'Télécharger dans l’App Store',
    googlePlay: 'Disponible sur Google Play',
  },
  // Same labels as `labels.fr.placeCategories` of @widoo/shared (checked by the tests): the
  // locked steps of a Premium route show their category only (E-21).
  placeCategories: {
    restaurant: 'Restaurant',
    cafe: 'Café',
    bar: 'Bar',
    bakery: 'Boulangerie',
    museum: 'Musée',
    gallery: 'Galerie',
    monument: 'Monument',
    park: 'Parc',
    viewpoint: 'Point de vue',
    shop: 'Boutique',
    activity: 'Activité',
    event_venue: 'Spectacle',
    walk: 'Balade',
    other: 'Autre',
  },
  // Same labels as `labels.fr.moods` of @widoo/shared (checked by the tests).
  moods: {
    culture: 'Culture',
    nature: 'Nature',
    shopping: 'Shopping',
    food: 'Gastronomie',
    romantic: 'Romantique',
    unusual: 'Insolite',
    instagrammable: 'Instagrammable',
    relax: 'Détente',
    sport: 'Sportif',
  },
  structuredData: {
    appDescription:
      'Des sorties toutes prêtes à Paris\u00a0: les étapes, la durée, le budget et les horaires.',
  },
} as const;

type Strings<T> = { readonly [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

/** Shape of the texts of one language: the keys of the French texts, any string as value. */
export type Messages = Strings<typeof fr>;
