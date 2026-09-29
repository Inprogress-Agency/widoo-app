import { localeTags, locales } from '@/config/locales';
import type { MetadataRoute } from 'next';
import { localizedPath } from './seo';

/** Paths of the indexable pages, without the language prefix. The legal pages arrive with #242. */
export const indexablePaths = ['/'] as const;

/** Every indexable page in every language, each linked to its other versions. */
export function buildSitemap(siteUrl: string): MetadataRoute.Sitemap {
  return indexablePaths.flatMap((path) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [
        localeTags[locale].lang,
        `${siteUrl}${localizedPath(locale, path)}`,
      ]),
    );
    return locales.map((locale) => ({
      url: `${siteUrl}${localizedPath(locale, path)}`,
      alternates: { languages },
    }));
  });
}

/**
 * Production opens the site to crawlers and names the sitemap; any other environment closes it.
 * Shared links (`/r/`) stay crawlable: their page says `noindex` itself (Site-Web).
 */
export function buildRobots(siteUrl: string, indexable: boolean): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${siteUrl}/sitemap.xml` };
}
