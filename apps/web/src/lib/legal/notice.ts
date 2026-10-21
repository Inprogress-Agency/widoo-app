import type { SiteLocale } from '@/config/locales';
import type { LegalText } from './types';

/**
 * The legal notice (LCEN, art. 6-III), as the wiki page Mentions-legales writes it in both
 * languages (D-107): written in the site, not served by the API, so that the page is online
 * whatever `WIDOO_API_URL`. Changed in the wiki first, then here, with a new version. The passage
 * in square brackets is still to complete in the wiki.
 */
export const legalNotice: Record<SiteLocale, LegalText> = {
  fr: {
    version: '2026-10-21',
    updatedAt: '2026-10-21',
    title: 'Mentions légales',
    summary: [],
    sections: [
      {
        title: 'Éditeur',
        body: 'Le site widooapp.com et l’application Widoo sont édités par Inprogress Agency, société par actions simplifiée au capital de 5 000 euros, immatriculée au registre du commerce et des sociétés de Bobigny sous le numéro 908 744 444, dont le siège est situé 14 avenue Georges Pompidou, 93360 Neuilly-Plaisance. Numéro de TVA intracommunautaire : FR38908744444.\n\nDirecteur de la publication : Ilan Amzallag, président.\n\nPour nous écrire : contact@widooapp.com.',
      },
      {
        title: 'Hébergement',
        // eslint-disable-next-line no-restricted-syntax -- « #4133 » is a suite number, not a color
        body: 'Le site widooapp.com est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis, téléphone : [à confirmer].\n\nL’application Widoo, ses serveurs et sa base de données sont hébergés par Google Cloud EMEA Limited, 70 Sir John Rogerson’s Quay, Dublin 2, D02 R296, Irlande ; les serveurs sont situés à Paris.',
      },
      {
        title: 'Données personnelles',
        body: 'Le site ne dépose aucun cookie. L’usage de vos données dans l’application est décrit dans la politique de confidentialité.',
      },
    ],
  },
  en: {
    version: '2026-10-21',
    updatedAt: '2026-10-21',
    title: 'Legal notice',
    summary: [],
    sections: [
      {
        title: 'Publisher',
        body: 'The widooapp.com website and the Widoo app are published by Inprogress Agency, a société par actions simplifiée (simplified joint-stock company) with a share capital of 5,000 euros, registered with the Bobigny Trade and Companies Register under number 908 744 444, whose registered office is at 14 avenue Georges Pompidou, 93360 Neuilly-Plaisance, France. EU VAT number: FR38908744444.\n\nPublication director: Ilan Amzallag, President.\n\nTo write to us: contact@widooapp.com.',
      },
      {
        title: 'Hosting',
        // eslint-disable-next-line no-restricted-syntax -- « #4133 » is a suite number, not a color
        body: 'The widooapp.com website is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States, phone: [to be confirmed].\n\nThe Widoo app, its servers and its database are hosted by Google Cloud EMEA Limited, 70 Sir John Rogerson’s Quay, Dublin 2, D02 R296, Ireland; the servers are located in Paris.',
      },
      {
        title: 'Personal data',
        body: 'The website sets no cookies. How the app uses your data is described in the privacy policy.',
      },
    ],
  },
};
