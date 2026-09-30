import { describe, expect, it, vi } from 'vitest';
import { getMessages, readLocale } from './messages';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

describe('readLocale', () => {
  it('accepts the languages of the site', () => {
    expect(readLocale('fr')).toBe('fr');
    expect(readLocale('en')).toBe('en');
  });

  it('turns an unknown language into a missing page', () => {
    expect(() => readLocale('de')).toThrow('NEXT_NOT_FOUND');
    expect(() => readLocale('FR')).toThrow('NEXT_NOT_FOUND');
  });
});

describe('getMessages', () => {
  it('returns the texts of the language', () => {
    expect(getMessages('fr').home.title).toMatch(/^Que faire/);
    expect(getMessages('en').home.title).toMatch(/^What to do/);
  });
});
