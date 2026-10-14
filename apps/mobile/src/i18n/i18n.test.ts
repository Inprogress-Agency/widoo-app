import { labels } from '@widoo/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { taxonomy } from './en';
import { taxonomyLabels } from './labels';
import { i18next, resources } from '.';

afterEach(async () => {
  await i18next.changeLanguage('fr');
});

type Tree = { [key: string]: string | Tree };

/** « map.noRoutes.title » → its string, for every string of a language. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.set(path, value);
    } else {
      flatten(value, path).forEach((text, nested) => entries.set(nested, text));
    }
  }
  return entries;
}

const variablesOf = (text: string) =>
  new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]));

/** Values the code gives that a French string does not need: English says a time as written. */
const englishOnlyValues: Record<string, string[]> = { 'clock.spoken': ['time'] };
const extraValuesOf = (key: string) =>
  Object.entries(englishOnlyValues).flatMap(([prefix, names]) =>
    key.startsWith(`${prefix}.`) ? names : [],
  );

const french = flatten(resources.fr.translation);
const english = flatten(resources.en.translation);

describe('i18n', () => {
  it('is ready in French as soon as it is imported, before any render', () => {
    expect(i18next.isInitialized).toBe(true);
    expect(i18next.language).toBe('fr');
    expect(i18next.t('tabs.routes')).toBe('Parcours');
  });

  it('follows the French plural rules: 0 and 1 are singular', () => {
    expect(i18next.t('duration.spoken.hours', { count: 0 })).toBe('0 heure');
    expect(i18next.t('duration.spoken.hours', { count: 1 })).toBe('1 heure');
    expect(i18next.t('duration.spoken.hours', { count: 14 })).toBe('14 heures');
  });

  it('switches to English without a restart, with the English plural rules', async () => {
    await i18next.changeLanguage('en');
    expect(i18next.t('tabs.routes')).toBe('Routes');
    expect(i18next.t('duration.spoken.hours', { count: 0 })).toBe('0 hours');
    expect(i18next.t('duration.spoken.hours', { count: 1 })).toBe('1 hour');
  });
});

describe('the translations', () => {
  it('miss no key in English nor in French', () => {
    expect([...french.keys()].filter((key) => !english.has(key))).toEqual([]);
    expect([...english.keys()].filter((key) => !french.has(key))).toEqual([]);
  });

  it('leave no string empty', () => {
    const empty = [...french, ...english].filter(([, text]) => text.trim() === '');
    expect(empty).toEqual([]);
  });

  it('use in English only the values the French string receives', () => {
    const unknown = [...english].flatMap(([key, text]) => {
      const given = new Set([...variablesOf(french.get(key) ?? ''), ...extraValuesOf(key)]);
      return [...variablesOf(text)]
        .filter((name) => !given.has(name))
        .map((name) => `${key}: ${name}`);
    });
    expect(unknown).toEqual([]);
  });

  it('label every value of the taxonomies the app shows, in both languages', () => {
    for (const group of Object.keys(taxonomy) as (keyof typeof taxonomy)[]) {
      expect(Object.keys(taxonomy[group]).sort()).toEqual(Object.keys(labels.fr[group]).sort());
    }
  });

  it('give the taxonomy labels of the language shown', async () => {
    expect(taxonomyLabels().conditions.rainy).toBe('Jour de pluie');
    await i18next.changeLanguage('en');
    expect(taxonomyLabels().conditions.rainy).toBe('Rainy day');
  });
});
