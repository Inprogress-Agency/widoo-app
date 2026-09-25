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
    recenter: 'Recentrer la carte',
    locationOff: 'Position désactivée · autour de Paris',
    enable: 'Activer',
    enableLocation: 'Activer la localisation',
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
  rating: {
    label: 'Note {{value}} sur 5',
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
