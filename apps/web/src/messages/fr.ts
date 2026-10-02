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
  howItWorks: {
    title: 'Des balades à Paris toutes prêtes',
    lead: 'Un lieu à voir, un café, une rue à remonter : chaque parcours enchaîne les étapes. Vous n’avez plus qu’à y aller.',
    steps: [
      {
        title: 'Choisissez votre sortie',
        text: 'Durée, budget, distance et étapes : tout est affiché, et vérifié sur place par ceux qui l’ont faite.',
      },
      {
        title: 'Programmez-la',
        text: 'Choisissez le jour. Widoo vous dit exactement {strong}, vérifie les horaires et vous rappelle la sortie la veille à 18:00.',
        strong: 'quoi prévoir et quoi réserver',
      },
      {
        title: 'Laissez-vous guider',
        text: 'Sur place, suivez le chemin d’une étape à l’autre, sans rien rater en route.',
      },
    ],
  },
  ideas: {
    title: 'Des idées de sortie pour chaque envie',
    lead: 'En amoureux, entre amis, en famille ou sous la pluie\u00a0: choisissez selon votre envie, votre budget et votre temps.',
    moods: {
      romantic: {
        title: 'Sortie en amoureux',
        text: 'Une balade au bord de l’eau, un verre au soleil couchant, une table un peu cachée.',
      },
      friends: {
        title: 'Entre amis',
        text: 'Friperies, adresses gourmandes et terrasses, pour une après-midi qui s’étire.',
      },
      freeFamily: {
        title: 'Sorties gratuites et en famille',
        text: 'Parcs, points de vue et jeux en plein air, sans rien dépenser.',
      },
      rainy: {
        title: 'Que faire quand il pleut',
        text: 'Passages couverts, musées et cafés\u00a0: des parcours à l’abri, pensés pour les jours de pluie.',
      },
      fullDay: {
        title: 'Toute une journée',
        text: 'Du matin au soir, un quartier en entier, pauses comprises.',
      },
    },
    routeMeta: '{duration}, {budget}, {author}',
    free: 'gratuit',
    byWidoo: 'par Widoo',
    byMember: 'par {name}',
  },
  districts: {
    title: 'Balades à Paris, quartier par quartier',
    lead: 'Chaque quartier a ses parcours, pensés par l’équipe Widoo et par ceux qui y vivent.',
    banks: { right: 'Rive droite', left: 'Rive gauche' },
    allParis: 'Tout Paris est dans l’app',
    items: {
      montmartre: {
        name: 'Montmartre',
        text: 'Escaliers, vignes et ateliers, loin de la place du Tertre.',
      },
      buttesChaumont: {
        name: 'Buttes-Chaumont et Belleville',
        text: 'Un parc à flanc de colline et des rues qui grimpent vers les points de vue.',
      },
      canalSaintMartin: {
        name: 'Canal Saint-Martin',
        text: 'Écluses, passerelles et pique-niques au bord de l’eau.',
      },
      passages: {
        name: 'Les passages couverts',
        text: 'Galerie Vivienne et ses voisins, pour flâner à l’abri.',
      },
      marais: {
        name: 'Le Marais',
        text: 'Hôtels particuliers, friperies et boulangeries, à deux pas les uns des autres.',
      },
      saintGermain: {
        name: 'Saint-Germain-des-Prés',
        text: 'Librairies, galeries et cafés de la rive gauche.',
      },
      latinQuarter: {
        name: 'Le Quartier latin',
        text: 'Ruelles, cinémas d’art et d’essai et jardin du Luxembourg.',
      },
    },
  },
  faq: {
    title: 'Questions fréquentes',
    lead: 'Tout ce qu’il faut savoir avant votre première sortie.',
    items: [
      {
        question: 'Widoo est-il gratuit\u00a0?',
        answer:
          'Oui. L’app est gratuite, les parcours gratuits s’ouvrent sans compte et créer vos parcours ne coûte rien. Les parcours Premium s’ouvrent avec un abonnement (essai gratuit de 7\u00a0jours), un pass de 7\u00a0jours ou à l’unité.',
      },
      {
        question: 'Faut-il créer un compte\u00a0?',
        answer:
          'Non, pour parcourir la carte et ouvrir les parcours gratuits. Un compte gratuit sert à enregistrer vos favoris, programmer une sortie et recevoir ses rappels.',
      },
      {
        question: 'Qu’est-ce qu’un parcours Widoo\u00a0?',
        answer:
          'Une sortie clé en main\u00a0: plusieurs étapes qui s’enchaînent, avec la durée, le budget, la distance et les horaires de chaque lieu.',
      },
      {
        question: 'Les informations sont-elles à jour\u00a0?',
        answer:
          'Les parcours sont vérifiés sur place par ceux qui les font, et Widoo vérifie les horaires quand vous programmez une sortie. Un lieu peut changer sans prévenir\u00a0: vérifiez avant de réserver.',
      },
      {
        question: 'Puis-je créer mon propre parcours\u00a0?',
        answer:
          'Oui, depuis l’app, gratuitement et sans limite. Chaque parcours est publié après relecture par l’équipe Widoo.',
      },
      {
        question: 'Widoo existe-t-il ailleurs qu’à Paris\u00a0?',
        answer: 'Pas encore\u00a0: Widoo commence par Paris.',
      },
    ],
    contactTitle: 'Une autre question\u00a0?',
    contactText: 'L’équipe Widoo vous répond par e-mail.',
  },
  banner: {
    title: 'Votre prochaine sortie commence ici',
    lead: 'Gratuit, sur iPhone et Android.',
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
