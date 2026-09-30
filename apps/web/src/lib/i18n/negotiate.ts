import { defaultLocale, foreignLocale, isSiteLocale, type SiteLocale } from '@/config/locales';

/**
 * Picks the language of the site from an `Accept-Language` header: the site language with the
 * highest weight (`fr-CA` counts as `fr`), the default language without a header, the foreign
 * language when the browser asks only for languages the site does not have.
 */
export function negotiateLocale(header: string | null | undefined): SiteLocale {
  if (!header?.trim()) return defaultLocale;

  let best: { locale: SiteLocale; weight: number } | undefined;
  for (const part of header.split(',')) {
    const [tag = '', ...params] = part.trim().split(';');
    const language = tag.trim().toLowerCase().split('-')[0] ?? '';
    const weight = readWeight(params);
    if (!isSiteLocale(language) || weight <= 0) continue;
    // Equal weights keep the order of the header: the first one listed wins.
    if (!best || weight > best.weight) best = { locale: language, weight };
  }
  return best?.locale ?? foreignLocale;
}

function readWeight(params: string[]): number {
  for (const param of params) {
    const [key, value] = param.trim().split('=');
    if (key?.trim() !== 'q') continue;
    const weight = Number(value);
    return Number.isFinite(weight) ? weight : 0;
  }
  return 1;
}
