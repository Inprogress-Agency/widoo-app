import { describe, expect, it } from 'vitest';
import { negotiateLocale } from './negotiate';

describe('negotiateLocale', () => {
  it('serves the default language without a header', () => {
    expect(negotiateLocale(null)).toBe('fr');
    expect(negotiateLocale(undefined)).toBe('fr');
    expect(negotiateLocale('  ')).toBe('fr');
  });

  it('matches a regional variant to its language', () => {
    expect(negotiateLocale('fr-CA')).toBe('fr');
    expect(negotiateLocale('en-GB,en;q=0.9')).toBe('en');
  });

  it('follows the weights, not the order', () => {
    expect(negotiateLocale('en;q=0.5,fr;q=0.8')).toBe('fr');
    expect(negotiateLocale('fr;q=0.3,de,en;q=0.7')).toBe('en');
  });

  it('keeps the first language listed on equal weights', () => {
    expect(negotiateLocale('en,fr')).toBe('en');
    expect(negotiateLocale('fr,en')).toBe('fr');
  });

  it('serves English to a browser that asks for other languages only', () => {
    expect(negotiateLocale('de-DE,es;q=0.8')).toBe('en');
    expect(negotiateLocale('*')).toBe('en');
  });

  it('ignores a language refused with a zero weight or an invalid weight', () => {
    expect(negotiateLocale('fr;q=0,en;q=0.1')).toBe('en');
    expect(negotiateLocale('fr;q=abc,en;q=0.2')).toBe('en');
  });
});
