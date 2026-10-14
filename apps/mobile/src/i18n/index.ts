import { appLocales, defaultAppLocale } from '@widoo/shared';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { fr } from './fr';

export const defaultNS = 'translation';
export const resources = { fr: { [defaultNS]: fr }, en: { [defaultNS]: en } } as const;

// French and English ship (D-062). Resources are bundled, so initialization is synchronous: the
// first render already reads the strings of the language chosen (`./language`), never a key.
void i18next.use(initReactI18next).init({
  lng: defaultAppLocale,
  fallbackLng: defaultAppLocale,
  supportedLngs: appLocales,
  defaultNS,
  resources,
  initAsync: false,
  // React escapes rendered strings already.
  interpolation: { escapeValue: false },
});

export { i18next };
