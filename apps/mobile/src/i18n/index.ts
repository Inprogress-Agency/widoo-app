import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { fr } from './fr';

export const defaultNS = 'translation';
export const resources = { fr: { [defaultNS]: fr } } as const;

// Only French ships at the MVP. Resources are bundled, so initialization is synchronous: the
// first render already reads French strings, never a key.
void i18next.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS,
  resources,
  initAsync: false,
  // React escapes rendered strings already.
  interpolation: { escapeValue: false },
});

export { i18next };
