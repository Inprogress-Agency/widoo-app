import { localeTags, type SiteLocale } from '@/config/locales';
import { localizedPath } from './seo';

export type JsonLdInput = {
  siteUrl: string;
  locale: SiteLocale;
  appName: string;
  publisherName: string;
  appDescription: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
};

type JsonLd = Record<string, unknown>;

/**
 * Structured data of the home page (Site-Web › Référencement): the publisher, the site, and the
 * app with its store pages. The app is left out until one of its store pages exists.
 */
export function homeJsonLd(input: JsonLdInput): JsonLd {
  const organizationId = `${input.siteUrl}/#organization`;
  const graph: JsonLd[] = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: input.publisherName,
      url: input.siteUrl,
    },
    {
      '@type': 'WebSite',
      '@id': `${input.siteUrl}/#website`,
      name: input.appName,
      url: `${input.siteUrl}${localizedPath(input.locale, '/')}`,
      inLanguage: localeTags[input.locale].lang,
      publisher: { '@id': organizationId },
    },
  ];

  const stores = [input.appStoreUrl, input.playStoreUrl].filter(
    (url): url is string => url !== undefined,
  );
  if (stores.length > 0) {
    graph.push({
      '@type': 'MobileApplication',
      name: input.appName,
      description: input.appDescription,
      operatingSystem: [input.appStoreUrl && 'iOS', input.playStoreUrl && 'Android']
        .filter(Boolean)
        .join(', '),
      applicationCategory: 'TravelApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      publisher: { '@id': organizationId },
      sameAs: stores,
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * JSON-LD ready for a `<script type="application/ld+json">`: `<` is escaped so that no text can
 * close the script element.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
