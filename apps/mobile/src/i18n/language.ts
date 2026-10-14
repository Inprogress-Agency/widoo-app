import type { AppLocale, Me } from '@widoo/shared';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { queryClient } from '../api/query-client';
import { meQueryPrefix } from '../api/search-cache';
import { createLanguageStore, phoneLanguage, shownLanguage, type LanguageChoice } from './choice';
import { i18next } from '.';

/**
 * The language of the app (D-062): the phone's, or the one chosen in Réglages › Langue, kept on
 * the phone and, with an account, in `users.locale`. Imported by the root layout, before the
 * first render.
 */

// MMKV (Architecture-Technique): read synchronously, so the first render is in the right language.
export const languageStore = createLanguageStore(createMMKV({ id: 'language' }));

/** The language « Langue du téléphone » gives now. */
export const phoneLocale = (): AppLocale =>
  phoneLanguage(getLocales().map((locale) => locale.languageCode));

function apply() {
  const next = shownLanguage(languageStore.get(), phoneLocale());
  // Resources are bundled: the change is synchronous, every screen re-renders in it at once.
  if (i18next.language !== next) {
    void i18next.changeLanguage(next);
  }
}

apply();
languageStore.subscribe(apply);
// The phone's language may have changed while the app was in the background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    apply();
  }
});

// The account's language wins over the phone's choice, whatever phone it was chosen on; null
// (« Langue du téléphone ») leaves the choice of this phone as it is.
queryClient.getQueryCache().subscribe((event) => {
  const { queryKey, state } = event.query;
  if (event.type !== 'updated' || queryKey[0] !== meQueryPrefix[0] || queryKey.length !== 2) {
    return;
  }
  const locale = (state.data as Pick<Me, 'locale'> | undefined)?.locale;
  if (locale) {
    languageStore.set(locale);
  }
});

/** Réglages › Langue: the choice, and the language the phone gives for « Langue du téléphone ». */
export function useLanguageChoice(): { choice: LanguageChoice; phone: AppLocale } {
  const choice = useSyncExternalStore(languageStore.subscribe, languageStore.get);
  return { choice, phone: phoneLocale() };
}
