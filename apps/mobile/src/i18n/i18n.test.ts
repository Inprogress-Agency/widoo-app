import { describe, expect, it } from 'vitest';
import { i18next } from '.';

describe('i18n', () => {
  it('is ready in French as soon as it is imported, before any render', () => {
    expect(i18next.isInitialized).toBe(true);
    expect(i18next.language).toBe('fr');
    expect(i18next.t('tabs.routes')).toBe('Parcours');
  });

  it('follows the French plural rules: 0 and 1 are singular', () => {
    expect(i18next.t('home.config.taxonomies', { count: 0 })).toBe('0 taxonomie');
    expect(i18next.t('home.config.taxonomies', { count: 1 })).toBe('1 taxonomie');
    expect(i18next.t('home.config.taxonomies', { count: 14 })).toBe('14 taxonomies');
  });
});
