import { describe, expect, it } from 'vitest';
import { appLocales, defaultAppLocale, effectiveLocale } from '.';

describe('effectiveLocale', () => {
  it('is the language chosen by the account, whatever the phone', () => {
    expect(effectiveLocale('en', 'fr')).toBe('en');
    expect(effectiveLocale('fr', 'en')).toBe('fr');
    expect(effectiveLocale('en', null)).toBe('en');
  });

  it('is the language of the last phone when the account follows the phone', () => {
    expect(effectiveLocale(null, 'en')).toBe('en');
  });

  it('is French without a choice nor a phone', () => {
    expect(effectiveLocale(null, null)).toBe('fr');
    expect(defaultAppLocale).toBe('fr');
  });
});

describe('appLocales', () => {
  it('ships French and English only, as lowercase codes', () => {
    expect(appLocales).toEqual(['fr', 'en']);
  });
});
