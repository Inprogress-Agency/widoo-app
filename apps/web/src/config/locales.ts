/** Languages of the site, each served under its own path prefix (`/fr`, `/en`). */
export const locales = ['fr', 'en'] as const;

export type SiteLocale = (typeof locales)[number];

/** Served when the browser sends no `Accept-Language` header (crawlers, link previews). */
export const defaultLocale: SiteLocale = 'fr';

/** Served when the browser asks only for languages the site does not have. */
export const foreignLocale: SiteLocale = 'en';

/** `lang` attribute and `og:locale` of each language. */
export const localeTags: Record<SiteLocale, { lang: string; openGraph: string }> = {
  fr: { lang: 'fr-FR', openGraph: 'fr_FR' },
  en: { lang: 'en', openGraph: 'en_US' },
};

export function isSiteLocale(value: string): value is SiteLocale {
  return (locales as readonly string[]).includes(value);
}
