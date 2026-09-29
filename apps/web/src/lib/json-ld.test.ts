import { describe, expect, it } from 'vitest';
import { homeJsonLd, serializeJsonLd, type JsonLdInput } from './json-ld';

const input: JsonLdInput = {
  siteUrl: 'https://widoo.example',
  locale: 'fr',
  appName: 'Widoo',
  publisherName: 'Inprogress Agency',
  appDescription: 'Des sorties toutes prêtes.',
};

function types(data: Record<string, unknown>): unknown[] {
  return (data['@graph'] as { '@type': string }[]).map((node) => node['@type']);
}

describe('homeJsonLd', () => {
  it('describes the publisher and the site in its language', () => {
    const data = homeJsonLd(input);
    expect(data['@context']).toBe('https://schema.org');
    expect(types(data)).toEqual(['Organization', 'WebSite']);
    expect(JSON.stringify(data)).toContain('"url":"https://widoo.example/fr"');
    expect(JSON.stringify(data)).toContain('"inLanguage":"fr-FR"');
  });

  it('adds the app once a store page exists, with its systems', () => {
    const data = homeJsonLd({
      ...input,
      appStoreUrl: 'https://apps.example/widoo',
      playStoreUrl: 'https://play.example/widoo',
    });
    expect(types(data)).toEqual(['Organization', 'WebSite', 'MobileApplication']);
    const app = (data['@graph'] as Record<string, unknown>[])[2];
    expect(app).toMatchObject({
      operatingSystem: 'iOS, Android',
      sameAs: ['https://apps.example/widoo', 'https://play.example/widoo'],
    });
  });

  it('names only the system whose store page exists', () => {
    const data = homeJsonLd({ ...input, playStoreUrl: 'https://play.example/widoo' });
    const app = (data['@graph'] as Record<string, unknown>[])[2];
    expect(app).toMatchObject({ operatingSystem: 'Android' });
  });
});

describe('serializeJsonLd', () => {
  it('cannot close the script element', () => {
    const text = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
