import type { AdminSection, CountedAdminSection, TeamRole } from '@widoo/shared';
import type { NavigationGroupId } from '@/config/navigation';

const sections: Record<AdminSection, string> = {
  dashboard: 'Tableau de bord',
  moderation: 'Modération',
  reports: 'Signalements',
  support: 'Support',
  catalog: 'Lieux et parcours',
  aiDrafts: 'Brouillons IA',
  translations: 'Traductions',
  users: 'Utilisateurs',
  affiliation: 'Affiliation',
  b2bClients: 'Partenaires B2B',
  settings: 'Réglages',
  actionLog: 'Journal',
};

const navigationGroups: Record<NavigationGroupId, string> = {
  toHandle: 'À traiter',
  catalog: 'Catalogue',
  community: 'Communauté',
  revenue: 'Revenus',
  administration: 'Administration',
};

const roles: Record<TeamRole, string> = {
  editor: 'Éditeur',
  moderator: 'Modérateur',
  admin: 'Admin',
};

/** Title of a page when it differs from the entry of its section in the navigation. */
const pageTitles: Partial<Record<AdminSection, string>> = {
  moderation: 'File de modération',
};

/**
 * Where « Reconnectez-vous pour revenir… » sends back, after « revenir » (A-01, session expirée).
 */
/** What each refusal reason means, under its label (A-02, « Refuser »). */
const rejectionExplanations = {
  not_a_route: 'Une liste de lieux sans enchaînement',
  place_invalid: 'Fermé, privé, introuvable ou adresse fausse',
  description_insufficient: 'Trop courte ou copiée',
  photos_invalid: 'Droits, crédit, visages ou mineurs',
  promotional: 'Publicité ou coordonnées personnelles',
  policy_violation: 'Illicite, dangereux ou discriminatoire',
  duplicate: 'Même parcours déjà publié',
} as const;

const returnTargets: Record<AdminSection, string> = {
  dashboard: 'au tableau de bord',
  moderation: 'à la file de modération',
  reports: 'aux signalements',
  support: 'au support',
  catalog: 'aux lieux et parcours',
  aiDrafts: 'aux brouillons IA',
  translations: 'aux traductions',
  users: 'aux utilisateurs',
  affiliation: "à l'affiliation",
  b2bClients: 'aux partenaires B2B',
  settings: 'aux réglages',
  actionLog: 'au journal',
};

/** What a counter of the navigation counts, said in full for screen readers and tooltips. */
const counted: Record<CountedAdminSection, (count: number) => string> = {
  moderation: (count) => `${count} parcours à relire`,
  reports: (count) => (count > 1 ? `${count} signalements ouverts` : '1 signalement ouvert'),
  support: (count) => (count > 1 ? `${count} messages à traiter` : '1 message à traiter'),
  aiDrafts: (count) => (count > 1 ? `${count} brouillons à relire` : '1 brouillon à relire'),
  translations: (count) => (count > 1 ? `${count} traductions en échec` : '1 traduction en échec'),
};

/** Texts of the admin. French only (wiki Admin-Web › Principes). */
export const messages = {
  app: { name: 'Widoo', product: 'Admin', title: 'Admin Widoo' },
  sections,
  pageTitles,
  roles,
  shell: {
    navigation: 'Navigation principale',
    groups: navigationGroups,
    collapse: 'Réduire le menu',
    expand: 'Agrandir le menu',
    account: 'Compte',
    signOut: 'Se déconnecter',
    loading: 'Chargement…',
    counted,
    /** After what is counted: « …, dont 2 en retard ». */
    lateAmong: (lateCount: number) => `, dont ${lateCount} en retard`,
  },
  signIn: {
    title: "Connexion à l'admin Widoo",
    subtitle: "Réservée aux comptes de l'équipe Widoo.",
    google: 'Continuer avec Google',
    or: 'ou',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'prenom@widooapp.com',
    sendLink: 'Recevoir un lien de connexion',
    help: "Un problème d'accès ? Demandez à un admin de l'équipe.",
    returnTo: (target: string) => `Reconnectez-vous pour revenir ${target}.`,
    expired: 'Votre session a expiré.',
    returnTargets,
    linkSent: {
      title: 'Vérifiez votre boîte mail',
      sentTo: 'Nous avons envoyé un lien de connexion à',
      openHere: 'Ouvrez-le sur cet ordinateur.',
      expiry: "Le lien ne sert qu'une fois et expire au bout de quelques heures.",
      resend: 'Renvoyer le lien',
      resendIn: (seconds: number) => `Renvoyer le lien dans ${seconds} s`,
      otherAddress: 'Utiliser une autre adresse',
    },
    refusals: {
      noAccess: {
        title: "Ce compte n'a pas accès à l'admin.",
        detail: "L'admin est réservé aux comptes de l'équipe Widoo.",
      },
      suspended: {
        title: 'Ce compte est suspendu.',
        detail: "Pour en savoir plus, adressez-vous à un admin de l'équipe Widoo.",
      },
    },
    signedInAs: (email: string) => `Vous étiez connecté avec ${email}.`,
    otherAccount: 'Utiliser un autre compte',
    code: {
      label: 'Code à 6 chiffres',
      placeholder: '000000',
    },
    challenge: {
      title: 'Code de vérification',
      text: "Saisissez le code à 6 chiffres affiché par votre application d'authentification.",
      submit: 'Vérifier',
    },
    enrollment: {
      title: 'Activez la double authentification',
      text: "L'admin Widoo demande un second code à chaque connexion. Il vous faut une application d'authentification sur votre téléphone (Google Authenticator, 1Password, Authy…).",
      scan: "1. Scannez ce QR code avec l'application.",
      qrCodeAlt: "QR code à scanner avec l'application d'authentification",
      manual: 'Ou saisissez cette clé à la main :',
      keepSecret:
        'Ne partagez ni ce QR code ni cette clé, et ne les photographiez pas : ils servent à produire vos codes.',
      enter: "2. Saisissez le code à 6 chiffres qu'elle affiche.",
      submit: 'Activer',
      preparing: 'Préparation du QR code…',
    },
    errors: {
      generic: "La connexion n'a pas abouti. Réessayez.",
      popupBlocked: 'Votre navigateur a bloqué la fenêtre de Google. Autorisez-la, puis réessayez.',
      linkInvalid: 'Ce lien de connexion a expiré ou a déjà servi. Demandez-en un nouveau.',
      codeInvalid: 'Ce code est incorrect ou a expiré. Saisissez le code affiché en ce moment.',
      recentSignInRequired: 'Votre connexion est trop ancienne pour cette étape. Reconnectez-vous.',
      linkOtherDevice:
        "Ouvrez le lien sur l'appareil où vous l'avez demandé, ou demandez-en un nouveau ici.",
      unavailable: "L'admin ne répond pas pour le moment.",
    },
    retry: 'Réessayer',
  },
  confirm: {
    reason: 'Motif',
    chooseReason: 'Choisir un motif',
    detail: 'Précision',
    detailHint: "Gardée dans le journal, visible par l'équipe.",
    cancel: 'Annuler',
    close: 'Fermer',
  },
  list: {
    range: (first: number, last: number, total: number) => `${first} à ${last} sur ${total}`,
    loading: 'Chargement de la liste',
    pages: 'Pages de la liste',
    previous: 'Précédent',
    next: 'Suivant',
    error: "La liste n'a pas pu être chargée.",
    retry: 'Réessayer',
  },
  dashboard: {
    error: "Le tableau de bord n'a pas pu être chargé.",
    updated: (when: string) => `Mis à jour ${when}`,
    refresh: 'Actualiser',
    toHandle: {
      title: 'À traiter',
      nothing: 'Rien à traiter pour le moment.',
      oldest: (time: string) => `Le plus ancien attend depuis ${time}`,
      tiles: {
        moderation: { label: 'Parcours à relire', none: 'Aucun parcours en attente' },
        reports: { label: 'Signalements ouverts', none: 'Aucun signalement ouvert' },
        support: { label: 'Messages de support', none: 'Aucun message à traiter' },
        aiDrafts: { label: 'Brouillons IA à relire', none: 'Aucun brouillon à relire' },
        translations: { label: 'Traductions en échec', none: 'Aucune traduction en échec' },
      },
    },
    catalog: {
      title: 'Catalogue',
      link: 'Analyses dans PostHog',
      publishedRoutes: 'Parcours publiés',
      publishedDetail: (premium: number, official: number) =>
        `dont ${premium} Premium et ${official} de Widoo`,
      places: 'Lieux',
      placesDetail: 'utilisés par les parcours',
      cities: 'Villes',
      citiesDetail: 'où des parcours existent',
      creators: 'Créateurs actifs',
      last30Days: 'sur les 30 derniers jours',
    },
    users: {
      title: 'Utilisateurs',
      link: 'Abonnements dans RevenueCat',
      registered: 'Inscrits',
      registeredDetail: 'depuis le lancement',
      newUsers: 'Nouveaux',
      newUsersDetail: 'sur les 7 derniers jours',
      premium: 'Premium actifs',
      premiumDetail: 'abonnements et pass',
      unlocks: 'Déblocages',
    },
  },
  moderation: {
    search: 'Rechercher un titre ou un auteur',
    total: (count: number) => `${count} parcours`,
    filters: {
      label: 'Filtres de la file',
      pending: 'En relecture',
      changesRequested: 'Modifications demandées',
      late: 'Plus de 72 h',
      revisions: 'Révisions',
      city: 'Ville',
    },
    columns: {
      route: 'Parcours',
      author: 'Auteur',
      city: 'Ville',
      content: 'Contenu',
      warnings: 'Alertes',
      unverified: 'Non vérifiés',
      waiting: 'En file',
    },
    firstSubmission: 'Première soumission',
    revision: 'Révision',
    toFix: 'À corriger',
    certified: 'créateur certifié',
    noAuthor: 'Compte supprimé',
    content: (steps: number, duration: string | null) =>
      `${steps} ${steps > 1 ? 'étapes' : 'étape'}${duration ? `, ${duration}` : ''}`,
    warnings: (count: number) => (count > 1 ? `${count} alertes` : '1 alerte'),
    noWarning: 'Aucune',
    unverified: (count: number) => (count > 1 ? `${count} lieux` : '1 lieu'),
    noUnverified: 'Aucun',
    late: 'en retard',
    sheet: {
      back: 'File de modération',
      position: (position: number, total: number) => `Parcours ${position} sur ${total}`,
      previous: 'Parcours précédent',
      next: 'Parcours suivant',
      notFound: "Ce parcours n'existe pas.",
      error: "La fiche n'a pas pu être chargée.",
      statuses: {
        pending: 'En relecture',
        changes_requested: 'À corriger',
        published: 'Publié',
        rejected: 'Refusé',
        unpublished: 'Retiré',
        needs_fix: 'À corriger',
        draft: 'Brouillon',
        private: 'Privé',
      },
      premium: 'Premium',
      premiumComputed: (minSteps: number) => `Premium calculé : ${minSteps} étapes ou plus`,
      waitingSince: 'En file depuis',
      warningsTitle: (count: number) =>
        count > 1 ? `${count} avertissements de cohérence` : '1 avertissement de cohérence',
      changes: {
        title: 'Changements depuis la version publiée',
        version: (date: string) => `Version du ${date}`,
        subjects: {
          step: (number: number) => `Étape ${number}`,
          title: 'Titre',
          description: 'Description',
        },
        kinds: { replaced: 'Remplacée', modified: 'Modifiée', duration_changed: 'Durée changée' },
        becomes: 'devient',
        before: 'Avant',
        after: 'Après',
        duration: 'Durée conseillée :',
      },
      previewTitle: "Le parcours tel qu'il sera publié",
      noDescription: 'Aucune description.',
      tiles: { duration: 'Durée', budget: 'Budget', steps: 'Étapes', distance: 'Distance' },
      budget: (euros: number) => (euros === 0 ? 'Gratuit' : `≈ ${Math.round(euros)} €`),
      distance: (meters: number) =>
        `${(meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`,
      mapTitle: 'Carte et étapes',
      mapLabel: (count: number) => `Plan des ${count} étapes, dans l'ordre du parcours`,
      onSite: (duration: string) => `${duration} sur place`,
      free: 'Gratuit',
      perPerson: (euros: number) => `≈ ${Math.round(euros)} € par pers.`,
      book: 'Réserver',
      neverVerified: 'Lieu jamais vérifié',
      transition: (duration: string, meters: number) =>
        `${duration} (${(meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km)`,
      transports: { walk: 'à pied', bike: 'à vélo', metro: 'en métro', car: 'en voiture' },
      author: {
        title: 'Auteur',
        certified: 'Créateur certifié',
        published: 'Parcours publiés',
        rejected: 'Parcours refusés',
        reports: 'Signalements reçus',
        registered: 'Inscription',
        seeAccount: 'Voir son compte',
      },
      history: {
        title: 'Historique',
        empty: 'Aucune décision pour le moment.',
        actions: {
          publish: 'Publié',
          request_changes: 'Modifications demandées',
          reject: 'Refusé',
          unpublish: 'Dépublié',
          edit: 'Modifié',
        },
        by: (action: string, name: string | null) => (name ? `${action} par ${name}` : action),
      },
    },
    charter: {
      title: 'Charte de publication',
      progress: (checked: number, total: number) => `${checked} sur ${total}`,
      hint: (total: number) => `Cochez les ${total} règles pour publier.`,
      rules: [
        {
          label: 'Un vrai parcours, pas une liste',
          description: "Les étapes s'enchaînent et forment un moment cohérent.",
        },
        {
          label: 'Des lieux réels et ouverts au public',
          description: 'Adresse exacte, aucun lieu privé.',
        },
        {
          label: 'Une description originale',
          description: "Le pourquoi et l'ambiance, rien de copié.",
        },
        {
          label: 'Des photos conformes',
          description: 'Personnelles ou libres avec crédit, sans visage ni mineur.',
        },
        {
          label: 'Aucune promotion déguisée',
          description: 'Pas de coordonnées ; liens affiliés déclarés.',
        },
        { label: 'Aucun contenu illicite ou dangereux', description: null },
      ],
    },
    decisions: {
      publish: 'Publier',
      requestChanges: 'Demander des modifications',
      reject: 'Refuser',
      requestChangesDialog: {
        title: 'Demander des modifications ?',
        description:
          "Le parcours passe en « À corriger ». Votre message est gardé dans son historique ; l'auteur n'est pas encore averti automatiquement.",
        message: "Message à l'auteur",
        messageHint: "Texte brut, sans < ni >. Gardé dans l'historique du parcours.",
        confirm: 'Demander les modifications',
      },
      rejectDialog: {
        reasonExplanations: rejectionExplanations,
        revisionTitle: 'Refuser cette révision ?',
        revisionDescription: (publishedOn: string) =>
          `Cette révision ne sera pas publiée : la version du ${publishedOn} reste en ligne. Le motif et votre message sont gardés dans l'historique ; l'auteur n'est pas encore averti automatiquement.`,
        revisionConfirm: 'Refuser la révision',
        messageTo: (firstName: string) => `Message à ${firstName}`,
        messagePlaceholder: 'Expliquez ce qui a conduit au refus.',
        messageRequired: "Écrivez un message à l'auteur.",
        title: 'Refuser ce parcours ?',
        description:
          "Le parcours est refusé. Le motif et votre message sont gardés dans son historique ; l'auteur n'est pas encore averti automatiquement.",
        message: "Message à l'auteur",
        messageHint: "Texte brut, sans < ni >. Gardé dans l'historique du parcours.",
        confirm: 'Refuser le parcours',
      },
      published: {
        title: "Publié à l'instant",
        by: (firstName: string) => `par ${firstName}, les 6 règles vérifiées`,
        text: 'Le parcours est en ligne.',
        next: 'Parcours suivant',
        toCatalog: 'Voir dans Lieux et parcours',
      },
      toasts: {
        published: 'Parcours publié',
        changesRequested: 'Modifications demandées',
        rejected: 'Parcours refusé',
        failed: "La décision n'a pas pu être enregistrée.",
        invalidMessage:
          'Le message est refusé : texte brut uniquement, sans < ni >, ni tabulation, 1 000 caractères au plus.',
        alreadyDecided: (status: string) =>
          `Un autre membre de l'équipe a déjà tranché : ${status.toLowerCase()}.`,
      },
    },
    empty: {
      title: 'La file est vide',
      text: 'Aucun parcours à relire pour le moment.',
      filteredTitle: 'Aucun parcours ne correspond',
      filteredText: 'Modifiez la recherche ou les filtres.',
    },
  },
  notFound: {
    title: 'Page introuvable',
    text: "Cette adresse n'existe pas dans l'admin.",
    back: 'Revenir au tableau de bord',
  },
} as const;
