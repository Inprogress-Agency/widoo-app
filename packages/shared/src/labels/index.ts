import { fr } from './fr';

/** Display labels by locale, ready to load as an i18next resource. Only French ships at the MVP. */
export const labels = { fr } as const;

export type Locale = keyof typeof labels;
export type { TaxonomyLabels } from './fr';
