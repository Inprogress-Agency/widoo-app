import { describe, expect, it } from 'vitest';
import { buildMetadata, localizedPath, type SeoInput } from './seo';

const home: SeoInput = {
  siteUrl: 'https://widoo.example',
  siteName: 'Widoo',
  indexable: true,
  locale: 'fr',
  path: '/',
  title: 'Titre',
  description: 'Description',
};

describe('localizedPath', () => {
  it('prefixes the path with the language', () => {
    expect(localizedPath('fr', '/')).toBe('/fr');
    expect(localizedPath('en', '/terms')).toBe('/en/terms');
    expect(localizedPath('en', 'terms/')).toBe('/en/terms');
  });
});

describe('buildMetadata', () => {
  it('links the canonical page and every language, with x-default on the home page', () => {
    const metadata = buildMetadata(home);
    expect(metadata.metadataBase?.toString()).toBe('https://widoo.example/');
    expect(metadata.alternates).toEqual({
      canonical: '/fr',
      languages: { 'fr-FR': '/fr', en: '/en', 'x-default': '/' },
    });
  });

  it('gives x-default to the home page only', () => {
    const metadata = buildMetadata({ ...home, locale: 'en', path: '/terms' });
    expect(metadata.alternates?.canonical).toBe('/en/terms');
    expect(metadata.alternates?.languages).toEqual({ 'fr-FR': '/fr/terms', en: '/en/terms' });
  });

  it('describes the page for link previews in its language', () => {
    const metadata = buildMetadata({ ...home, locale: 'en' });
    expect(metadata.openGraph).toMatchObject({
      url: '/en',
      title: 'Titre',
      locale: 'en_US',
      alternateLocale: ['fr_FR'],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', title: 'Titre' });
  });

  it('indexes the page in production only', () => {
    expect(buildMetadata(home).robots).toEqual({ index: true, follow: true });
    expect(buildMetadata({ ...home, indexable: false }).robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('never indexes a page that asks for it, even in production', () => {
    expect(buildMetadata({ ...home, noIndex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
