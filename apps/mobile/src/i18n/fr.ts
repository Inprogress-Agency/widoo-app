/** French strings of the app. Keys in English, grouped by screen or component. */
export const fr = {
  tabs: {
    home: 'Accueil',
    routes: 'Parcours',
    profile: 'Profil',
  },
  home: {
    title: 'Accueil',
    config: {
      heading: 'Configuration du service',
      minAppVersion: "Version minimale de l'app : {{version}}",
      taxonomies_one: '{{count}} taxonomie',
      taxonomies_other: '{{count}} taxonomies',
      moods: 'Ambiances : {{labels}}',
      apiUrl: 'Service : {{url}}',
      loading: 'Chargement de la configuration…',
      errorTitle: 'Impossible de charger la configuration',
      connectionBody: 'Vérifiez votre connexion puis réessayez.',
      serviceBody: 'Le service ne répond pas correctement. Réessayez dans un instant.',
      offlineTitle: 'Pas de connexion',
      offlineBody: 'La configuration se chargera au retour du réseau.',
      retry: 'Réessayer',
    },
  },
  routes: {
    title: 'Mes parcours',
  },
  profile: {
    title: 'Profil',
  },
  consent: {
    title: "Mesure d'audience",
    body: "Avec votre accord, Widoo mesure l'usage de l'app pour l'améliorer, avec PostHog, hébergé dans l'Union européenne. Les rapports de plantage restent envoyés, sans information sur vous.",
    accept: 'Accepter',
    refuse: 'Refuser',
  },
};
