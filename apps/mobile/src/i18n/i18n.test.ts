import { describe, expect, it } from 'vitest';
import { i18next } from '.';

describe('i18n', () => {
  it('is ready in French as soon as it is imported, before any render', () => {
    expect(i18next.isInitialized).toBe(true);
    expect(i18next.language).toBe('fr');
    expect(i18next.t('tabs.routes')).toBe('Parcours');
  });
});
