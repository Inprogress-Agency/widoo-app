import { localeTags, locales, type SiteLocale } from '@/config/locales';
import type { Metadata } from 'next';

export type SeoInput = {
  /** Origin of the site (`SITE_URL`). */
  siteUrl: string;
  siteName: string;
  indexable: boolean;
  locale: SiteLocale;
  /** Path of the page without the language prefix: `/` for the home page, `/conditions`… */
  path: string;
  title: string;
  description?: string;
  /** Pages that must never be indexed, whatever the environment: private links (`/r/`). */
  noIndex?: boolean;
};

/** Path of a page in a language: `/fr`, `/en/terms`. */
export function localizedPath(locale: SiteLocale, path: string): string {
  const clean = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  return `/${locale}${clean}`;
}

/**
 * Metadata of a page (Site-Web › Référencement): title, description, canonical link, versions in
 * every language (`hreflang`, with `x-default` on the language negotiation of `/`), Open Graph and
 * Twitter card. Outside production, and for the pages that ask for it, the page is `noindex`.
 */
export function buildMetadata(input: SeoInput): Metadata {
  const { siteUrl, locale, path, title, description } = input;
  const canonical = localizedPath(locale, path);
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((other) => [localeTags[other].lang, localizedPath(other, path)]),
  );
  if (path === '/') languages['x-default'] = '/';
  const index = input.indexable && !input.noIndex;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical, languages },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: input.siteName,
      url: canonical,
      title,
      description,
      locale: localeTags[locale].openGraph,
      alternateLocale: locales
        .filter((other) => other !== locale)
        .map((other) => localeTags[other].openGraph),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}
