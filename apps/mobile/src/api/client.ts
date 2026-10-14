import { createApiClient } from '@widoo/api-client';
import Constants from 'expo-constants';
import { session } from '../auth';
import { SEARCH_TIMEOUT_MS } from '../search/textSearch';
import { resolveApiUrl } from './api-url';

// `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle.
export const apiUrl = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  isDev: __DEV__,
});

/**
 * The Firebase token of the session goes with the authenticated requests, and with the public
 * ones whose answer depends on the caller (`/routes/search`, D-075); after a 401, it is
 * refreshed and the request tried once more (`@widoo/api-client`).
 */
export const api = createApiClient({ baseUrl: apiUrl, getToken: session.getToken });

/**
 * The search of E-02, whose requests give up after 5 s (Ecrans › E-02, chargement): the group
 * that did not answer shows its error, the other its results.
 */
export const searchApi = createApiClient({ baseUrl: apiUrl, timeoutMs: SEARCH_TIMEOUT_MS });
