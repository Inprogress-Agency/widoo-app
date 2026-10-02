import type { LegalDoc } from '@/config/legal';
import type { SiteLocale } from '@/config/locales';
import type { LegalText } from './types';

/**
 * Excerpts of the drafts of the wiki (Conditions-d-utilisation, Politique-de-confidentialite,
 * D-063), shown in development only to review the pages; the English is a draft translation.
 * Never online: the texts come from the API (#206), once the legal review is done.
 */
export const legalFixtures: Record<LegalDoc, Record<SiteLocale, LegalText>> = {
  terms: {
    fr: {
      version: 'draft',
      updatedAt: '2026-09-28',
      title: 'Conditions d’utilisation de Widoo',
      summary: [],
      sections: [
        {
          title: '2. À quoi servent ces conditions',
          body: 'Widoo propose des parcours de sortie clé en main à Paris : plusieurs étapes qui s’enchaînent, avec leur durée, leur budget et leurs horaires, que vous pouvez consulter, programmer, vivre et créer.\n\nCes conditions fixent les règles d’utilisation de l’app. Vous les acceptez en créant votre compte. Sans compte, elles s’appliquent dès que vous utilisez l’app.\n\nWidoo est réservé aux personnes de 16 ans et plus.',
        },
        {
          title: '3. Sans compte et avec un compte',
          body: 'Sans compte, vous pouvez parcourir la carte, chercher, filtrer et ouvrir tous les parcours gratuits, sans limite.\n\nEn créant votre compte, vous vous engagez à :\n\n- utiliser une adresse e-mail qui vous appartient et à la garder à jour ;\n- choisir un prénom ou un pseudo qui ne trompe personne et n’usurpe l’identité de personne ;\n- garder l’accès à votre compte pour vous, et nous prévenir si vous pensez que quelqu’un d’autre l’utilise.',
        },
      ],
    },
    en: {
      version: 'draft',
      updatedAt: '2026-09-28',
      title: 'Widoo terms of use',
      summary: [],
      sections: [
        {
          title: '2. What these terms are for',
          body: 'Widoo offers ready-made outing routes in Paris: several stops in a row, with their duration, their budget and their opening hours, that you can browse, plan, live and create.\n\nThese terms set the rules for using the app. You accept them by creating your account. Without an account, they apply as soon as you use the app.\n\nWidoo is for people aged 16 and over.',
        },
        {
          title: '3. Without an account and with an account',
          body: 'Without an account, you can browse the map, search, filter and open every free route, without limit.\n\nBy creating your account, you agree to:\n\n- use an email address that belongs to you and keep it up to date;\n- choose a first name or a nickname that misleads no one and impersonates no one;\n- keep access to your account to yourself, and tell us if you think someone else uses it.',
        },
      ],
    },
  },
  privacy: {
    fr: {
      version: 'draft',
      updatedAt: '2026-09-28',
      title: 'Politique de confidentialité de Widoo',
      summary: [
        'Nous gardons votre profil, vos favoris, vos sorties et vos parcours.',
        'Votre position sert sur le téléphone ; elle n’est jamais enregistrée sur nos serveurs.',
        'La mesure d’audience n’a lieu qu’avec votre accord.',
      ],
      sections: [
        {
          title: '7. Âge minimum',
          body: 'Widoo est réservé aux personnes de 16 ans et plus. Si nous apprenons qu’un compte a été créé par une personne plus jeune, nous le supprimons.',
        },
        {
          title: '8. Traceurs',
          body: 'L’app n’utilise ni cookie publicitaire ni identifiant publicitaire du téléphone. La mesure d’audience ne démarre qu’après votre accord, demandé au premier lancement ; votre choix est gardé sur le téléphone et se change dans Réglages › Confidentialité.',
        },
      ],
    },
    en: {
      version: 'draft',
      updatedAt: '2026-09-28',
      title: 'Widoo privacy policy',
      summary: [
        'We keep your profile, your favourites, your outings and your routes.',
        'Your location is used on your phone; it is never stored on our servers.',
        'Audience measurement only happens with your consent.',
      ],
      sections: [
        {
          title: '7. Minimum age',
          body: 'Widoo is for people aged 16 and over. If we learn that an account was created by a younger person, we delete it.',
        },
        {
          title: '8. Trackers',
          body: 'The app uses neither advertising cookies nor the advertising identifier of the phone. Audience measurement only starts after your consent, asked at first launch; your choice is kept on the phone and can be changed in Settings › Privacy.',
        },
      ],
    },
  },
};
