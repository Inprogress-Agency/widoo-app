import { appLocales, defaultAppLocale, type AppLocale } from '@widoo/shared';
import type { KeyValueStorage } from '../analytics/consent';

/** Réglages › Langue (Ecrans › E-19): the phone's language, or a language of the app. */
export type LanguageChoice = 'device' | AppLocale;

const isAppLocale = (code: string | null | undefined): code is AppLocale =>
  appLocales.some((locale) => locale === code);

/**
 * The language « Langue du téléphone » gives: the first language of the phone when the app ships
 * it, French otherwise (Architecture-Technique › i18n).
 */
export function phoneLanguage(languageCodes: readonly (string | null)[]): AppLocale {
  const first = languageCodes[0];
  return isAppLocale(first) ? first : defaultAppLocale;
}

/** The language the app shows for a choice. */
export const shownLanguage = (choice: LanguageChoice, phone: AppLocale): AppLocale =>
  choice === 'device' ? phone : choice;

/** What `users.locale` keeps for a choice: null follows the phone. */
export const accountLocaleOf = (choice: LanguageChoice): AppLocale | null =>
  choice === 'device' ? null : choice;

const CHOICE_KEY = 'language.choice';

export interface LanguageStore {
  get(): LanguageChoice;
  set(choice: LanguageChoice): void;
  /** For `useSyncExternalStore`: called after every change. */
  subscribe(listener: () => void): () => void;
}

/**
 * The language chosen on this phone, read synchronously at startup so that the first render is in
 * the right language. Without account it is the only record of the choice; with one, it follows
 * `users.locale` and keeps the app in the account's language offline.
 */
export function createLanguageStore(storage: KeyValueStorage): LanguageStore {
  const stored = storage.getString(CHOICE_KEY);
  let choice: LanguageChoice = isAppLocale(stored) ? stored : 'device';
  const listeners = new Set<() => void>();
  return {
    get: () => choice,
    set(next) {
      if (next === choice) {
        return;
      }
      storage.set(CHOICE_KEY, next);
      choice = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
