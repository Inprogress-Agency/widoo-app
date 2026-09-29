import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap } from './crawling';

describe('buildSitemap', () => {
  it('lists the home page in both languages, linked to each other', () => {
    const languages = { 'fr-FR': 'https://widoo.example/fr', en: 'https://widoo.example/en' };
    expect(buildSitemap('https://widoo.example')).toEqual([
      { url: 'https://widoo.example/fr', alternates: { languages } },
      { url: 'https://widoo.example/en', alternates: { languages } },
    ]);
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
