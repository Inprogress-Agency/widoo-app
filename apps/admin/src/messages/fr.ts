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
