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
    returnTargets,
    linkSent: {
      title: 'Vérifiez votre boîte mail',
      sentTo: 'Nous avons envoyé un lien de connexion à',
      expiry: "Le lien ne sert qu'une fois et expire au bout de quelques heures.",
      resend: 'Renvoyer le lien',
      resendIn: (seconds: number) => `Renvoyer le lien dans ${seconds} s`,
      otherAddress: 'Utiliser une autre adresse',
    },
    refusals: {
      noAccess: { title: "Ce compte n'a pas accès à l'admin.", detail: null },
      suspended: {
        title: 'Ce compte est suspendu.',
        detail: "Pour en savoir plus, adressez-vous à un admin de l'équipe Widoo.",
      },
    },
    errors: {
      generic: "La connexion n'a pas abouti. Réessayez.",
      popupBlocked: 'Votre navigateur a bloqué la fenêtre de Google. Autorisez-la, puis réessayez.',
      linkInvalid: 'Ce lien de connexion a expiré ou a déjà servi. Demandez-en un nouveau.',
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
    loading: 'Chargement de la liste',
    pages: 'Pages de la liste',
    previous: 'Précédent',
    next: 'Suivant',
    error: "La liste n'a pas pu être chargée.",
    retry: 'Réessayer',
  },
  notFound: {
    title: 'Page introuvable',
    text: "Cette adresse n'existe pas dans l'admin.",
    back: 'Revenir au tableau de bord',
  },
} as const;
