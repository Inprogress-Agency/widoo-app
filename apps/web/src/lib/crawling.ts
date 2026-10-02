import { legalDocs, legalPaths } from '@/config/legal';
import { localeTags, locales, type SiteLocale } from '@/config/locales';
import type { MetadataRoute } from 'next';
import { localizedPath } from './seo';

const home: Record<SiteLocale, string> = { fr: '/', en: '/' };

/**
 * Every indexable page in every language, each linked to its other versions: the home page, and
 * the legal pages once the API serves their texts (`withLegal`, #242), with their path in each
 * language.
 */
export function buildSitemap(siteUrl: string, withLegal: boolean): MetadataRoute.Sitemap {
  const pages = [home, ...(withLegal ? legalDocs.map((doc) => legalPaths[doc]) : [])];
  return pages.flatMap((paths) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [
        localeTags[locale].lang,
        `${siteUrl}${localizedPath(locale, paths[locale])}`,
      ]),
    );
    return locales.map((locale) => ({
      url: `${siteUrl}${localizedPath(locale, paths[locale])}`,
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
