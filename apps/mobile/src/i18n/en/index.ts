import type { Translation } from '../translation';
import { common } from './common';
import { discovery } from './discovery';
import { go } from './go';
import { profile } from './profile';
import { route } from './route';
import { routes } from './routes';
import { settings } from './settings';

/** English strings of the app (D-062), by screen; the same keys as the French ones. */
export const en: Translation = {
  ...discovery,
  ...route,
  ...routes,
  ...go,
  ...profile,
  ...settings,
  ...common,
};

export { taxonomy, type AppTaxonomy } from './taxonomy';
