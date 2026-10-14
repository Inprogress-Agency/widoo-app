import { numberFormat } from '../i18n/formats';

/** « 4,9 » in French, « 4.9 » in English: always one decimal. */
export const formatRating = (average: number) =>
  numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average);
