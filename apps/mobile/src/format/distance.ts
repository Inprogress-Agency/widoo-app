import type { TFunction } from 'i18next';

const kilometers = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Meters under a kilometer are rounded to this step: a position is never that precise. */
const METER_STEP = 50;

/**
 * A distance as written in the app: « 850 m », « 4,2 km », « 12 km »; `spoken` is what a screen
 * reader says: « 850 mètres », « 4,2 kilomètres ».
 */
export function formatDistance(t: TFunction, meters: number, form: 'short' | 'spoken'): string {
  const rounded = Math.max(METER_STEP, Math.round(meters / METER_STEP) * METER_STEP);
  if (rounded < 1000) {
    return t(`distance.${form}.meters`, { count: rounded });
  }
  const km = meters / 1000;
  const value = kilometers.format(km >= 10 ? Math.round(km) : Math.round(km * 10) / 10);
  return t(`distance.${form}.kilometers`, { count: km, value });
}
