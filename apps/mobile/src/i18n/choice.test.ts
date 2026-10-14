import { describe, expect, it } from 'vitest';
import { accountLocaleOf, createLanguageStore, phoneLanguage, shownLanguage } from './choice';

const memory = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => void values.set(key, value),
    values,
  };
};

describe('phoneLanguage', () => {
  it('takes the first language of the phone when the app ships it, French otherwise', () => {
    expect(phoneLanguage(['en', 'fr'])).toBe('en');
    expect(phoneLanguage(['fr'])).toBe('fr');
    expect(phoneLanguage(['de', 'en'])).toBe('fr');
    expect(phoneLanguage([null])).toBe('fr');
    expect(phoneLanguage([])).toBe('fr');
  });
});

describe('the language choice', () => {
  it('shows the phone language by default, a chosen language over it', () => {
    expect(shownLanguage('device', 'en')).toBe('en');
    expect(shownLanguage('fr', 'en')).toBe('fr');
    expect(accountLocaleOf('device')).toBeNull();
    expect(accountLocaleOf('en')).toBe('en');
  });

  it('is kept on the phone and tells its listeners once per change', () => {
    const storage = memory();
    const store = createLanguageStore(storage);
    expect(store.get()).toBe('device');
    let calls = 0;
    store.subscribe(() => (calls += 1));
    store.set('en');
    store.set('en');
    expect(calls).toBe(1);
    expect(createLanguageStore(storage).get()).toBe('en');
  });

  it('ignores a stored value it does not know', () => {
    expect(createLanguageStore(memory({ 'language.choice': 'de' })).get()).toBe('device');
  });
});
