import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap } from './crawling';

describe('buildSitemap', () => {
  it('lists the home page in both languages, linked to each other', () => {
    const languages = { 'fr-FR': 'https://widoo.example/fr', en: 'https://widoo.example/en' };
    expect(buildSitemap('https://widoo.example', false)).toEqual([
      { url: 'https://widoo.example/fr', alternates: { languages } },
      { url: 'https://widoo.example/en', alternates: { languages } },
    ]);
  });

  it('adds the legal pages with their path in each language once the API serves them', () => {
    const urls = buildSitemap('https://widoo.example', true).map(({ url }) => url);
    expect(urls).toEqual([
      'https://widoo.example/fr',
      'https://widoo.example/en',
      'https://widoo.example/fr/conditions',
      'https://widoo.example/en/terms',
      'https://widoo.example/fr/confidentialite',
      'https://widoo.example/en/privacy',
    ]);
    expect(buildSitemap('https://widoo.example', true)[3]?.alternates).toEqual({
      languages: {
        'fr-FR': 'https://widoo.example/fr/conditions',
        en: 'https://widoo.example/en/terms',
      },
    });
  });
});

describe('buildRobots', () => {
  it('opens the site and names the sitemap in production', () => {
    expect(buildRobots('https://widoo.example', true)).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: 'https://widoo.example/sitemap.xml',
    });
  });

  it('closes staging and previews to every crawler', () => {
    expect(buildRobots('https://staging.example', false)).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    });
  });
});
