import { describe, expect, it } from 'vitest';
import { messages } from '.';
import { locales } from '@/config/locales';

function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    strings(child, path ? `${path}.${key}` : key),
  );
}

describe.each(locales)('texts in %s', (locale) => {
  const texts = strings(messages[locale]);

  it('keeps the title of the home page between 50 and 60 characters (Site-Web)', () => {
    expect(messages[locale].meta.home.title.length).toBeGreaterThanOrEqual(50);
    expect(messages[locale].meta.home.title.length).toBeLessThanOrEqual(60);
  });

  it('keeps the description of the home page between 110 and 160 characters (Site-Web)', () => {
    expect(messages[locale].meta.home.description.length).toBeGreaterThanOrEqual(110);
    expect(messages[locale].meta.home.description.length).toBeLessThanOrEqual(160);
  });

  it('has no empty text and no long dash (E-21)', () => {
    for (const [path, text] of texts) {
      expect(text.trim(), path).not.toBe('');
      expect(text, path).not.toMatch(/[—–]/);
    }
  });
});

describe('texts in French', () => {
  it('put a non-breaking space before « : ? ! », never a plain one (E-21)', () => {
    for (const [path, text] of strings(messages.fr)) {
      expect(text, path).not.toMatch(/ [:?!]/);
      expect(text, path).not.toMatch(/[^\u00a0\s][:?!](\s|$)/);
    }
  });
});

describe('texts in English', () => {
  it('have exactly the keys of the French texts', () => {
    const keys = (locale: 'fr' | 'en') => strings(messages[locale]).map(([path]) => path);
    expect(keys('en')).toEqual(keys('fr'));
  });
});
