import { describe, expect, it } from 'vitest';
import { pathInLocale } from './path-in-locale';

describe('pathInLocale', () => {
  it('changes the language of an address, the rest kept', () => {
    expect(pathInLocale('/fr', 'en')).toBe('/en');
    expect(pathInLocale('/fr/r/abc', 'en')).toBe('/en/r/abc');
  });

  it('gives a legal page its path in the other language', () => {
    expect(pathInLocale('/en/terms', 'fr')).toBe('/fr/conditions');
    expect(pathInLocale('/fr/confidentialite', 'en')).toBe('/en/privacy');
  });
});
