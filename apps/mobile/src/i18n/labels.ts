import { labels, type TaxonomyLabels } from '@widoo/shared';
import i18next from 'i18next';
import { taxonomy, type AppTaxonomy } from './en';

/**
 * Labels of the taxonomies in the language shown now: « Culture », « Jour de pluie », « Rainy
 * day ». Read at render: a screen that translates re-renders on a change of language.
 */
export const taxonomyLabels = (): Pick<TaxonomyLabels, AppTaxonomy> =>
  i18next.language === 'en' ? taxonomy : labels.fr;
