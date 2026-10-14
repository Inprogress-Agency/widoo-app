import type { AppLocale } from './schemas/me';

/**
 * Short label of an arrondissement in the language of the app, as the zones of the search show
 * it after the city (« Paris 18e », « Paris 18th »): French « 1er » then « 2e », English ordinals.
 */
export function arrondissementLabel(number: number, locale: AppLocale): string {
  if (locale === 'fr') {
    return number === 1 ? '1er' : `${number}e`;
  }
  const lastTwo = number % 100;
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : (suffixes[number % 10] ?? 'th');
  return `${number}${suffix}`;
}
