/** French strings of the app. Keys in English, grouped by screen or component. */
export const fr = {
  tabs: {
    home: 'Accueil',
    routes: 'Parcours',
    profile: 'Profil',
  },
  map: {
    label: 'Carte, {{count}} parcours',
    marker: '{{title}}, {{duration}}',
    clustersLabel_one: 'Carte, {{count}} parcours regroupé par quartier',
    clustersLabel_other: 'Carte, {{count}} parcours regroupés par quartier',
    cluster: 'Groupe de {{count}} parcours, zoomer',
    recenter: 'Recentrer la carte',
    searchZone: 'Rechercher dans cette zone',
    searching: 'Recherche…',
    noRoutes: {
      title: 'Aucun parcours par ici',
      titleFiltered: 'Aucun parcours par ici avec ces filtres',
      body: 'Élargissez la zone pour voir plus de parcours.',
      bodyFiltered: 'Élargissez la zone ou retirez des filtres pour voir plus de parcours.',
      widen: 'Élargir la zone',
      clearFilters_one: 'Retirer le filtre',
      clearFilters_other: 'Retirer les {{count}} filtres',
    },
    zoomIn: {
      title: 'Zoomez pour voir les parcours',
      body_one: '{{count}} parcours dans cette zone.',
      body_other: '{{count}} parcours dans cette zone.',
    },
    locationOff: 'Position désactivée · autour de Paris',
    enable: 'Activer',
    enableLocation: 'Activer la localisation',
    tooltip: {
      label: 'Parcours {{title}}, étape 1 sur {{total}}, {{place}}',
      lockedLabel_one: '{{title}}, parcours Premium, {{count}} étape en {{duration}}',
      lockedLabel_other: '{{title}}, parcours Premium, {{count}} étapes en {{duration}}',
      premium: 'Parcours Premium',
      steps_one: '{{count}} étape en {{duration}}',
      steps_other: '{{count}} étapes en {{duration}}',
      step: 'Étape 1/{{total}}',
      more: 'Voir plus',
    },
  },
  sheet: {
    label: 'Résultats',
    nearby: 'À proximité',
    count_one: '{{count}} parcours',
    count_other: '{{count}} parcours',
    inZone: '{{count}} · {{zone}}',
    paris: 'Paris',
    searching: 'Recherche autour de vous…',
    offline: 'Hors connexion · résultats du {{day}} à {{time}}',
    error: 'Impossible de charger les parcours',
    noConnection: 'Pas de connexion',
    errorBody: 'Vérifiez votre connexion puis réessayez.',
    retry: 'Réessayer',
    level: {
      rest: 'réduits',
      half: 'à mi-hauteur',
      full: 'en plein écran',
    },
  },
  summary: {
    label: 'Parcours sélectionné, {{card}}',
    open: 'Voir le parcours',
  },
  card: {
    by: 'Par {{name}}',
    byWidoo: 'Par Widoo',
    member: 'Membre Widoo',
    distance: 'à {{distance}}',
    open: 'Ouvre la fiche du parcours',
  },
  route: {
    title: 'Fiche du parcours',
    comingSoon: 'La fiche détaillée arrive bientôt.',
    back: 'Retour',
  },
  routes: {
    title: 'Mes parcours',
  },
  profile: {
    title: 'Profil',
  },
  // Unbreakable spaces in the written forms: « 7 h » never splits over two lines.
  duration: {
    short: {
      minutes: '{{minutes}}\u00a0min',
      hours: '{{hours}}\u00a0h',
      hoursMinutes: '{{hours}}\u00a0h\u00a0{{minutes}}',
    },
    spoken: {
      minutes_one: '{{count}} minute',
      minutes_other: '{{count}} minutes',
      hours_one: '{{count}} heure',
      hours_other: '{{count}} heures',
      hoursMinutes_one: '{{count}} heure {{minutes}}',
      hoursMinutes_other: '{{count}} heures {{minutes}}',
    },
  },
  // « ≈ 25 € par pers. », never « env. » nor a range (D-032).
  budget: {
    amount: '≈ {{euros}} €',
    perPerson: 'par pers.',
    spoken: 'environ {{euros}} euros par personne',
    free: 'Gratuit',
  },
  distance: {
    short: {
      meters: '{{count}} m',
      kilometers: '{{value}} km',
    },
    spoken: {
      meters_one: '{{count}} mètre',
      meters_other: '{{count}} mètres',
      kilometers_one: '{{value}} kilomètre',
      kilometers_other: '{{value}} kilomètres',
    },
  },
  rating: {
    label: 'Note {{value}} sur 5',
  },
  favorite: {
    add: 'Ajouter aux favoris',
    remove: 'Retirer des favoris',
    comingSoon: 'Les favoris arrivent bientôt.',
  },
  badges: {
    verified: 'Vérifié',
    signature: 'Signature',
    premium: 'Premium',
    private: 'Privé',
    new: 'Nouveau',
    certified: 'Créateur certifié',
  },
  consent: {
    title: "Mesure d'audience",
    body: "Avec votre accord, Widoo mesure l'usage de l'app pour l'améliorer, avec PostHog, hébergé dans l'Union européenne. Les rapports de plantage restent envoyés, sans information sur vous.",
    accept: 'Accepter',
    refuse: 'Refuser',
  },
};
