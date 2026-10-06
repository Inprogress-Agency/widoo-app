import { createApiClient } from '@widoo/api-client';
import Constants from 'expo-constants';
import { SEARCH_TIMEOUT_MS } from '../search/textSearch';
import { resolveApiUrl } from './api-url';

// `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle.
export const apiUrl = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  isDev: __DEV__,
});

/** No `getToken` until Firebase Auth reaches the app (E-10): authenticated routes answer 401. */
export const api = createApiClient({ baseUrl: apiUrl });

/**
 * The search of E-02, whose requests give up after 5 s (Ecrans › E-02, chargement): the group
 * that did not answer shows its error, the other its results.
 */
export const searchApi = createApiClient({ baseUrl: apiUrl, timeoutMs: SEARCH_TIMEOUT_MS });
