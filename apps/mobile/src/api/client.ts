import { createApiClient } from '@widoo/api-client';
import Constants from 'expo-constants';
import { resolveApiUrl } from './api-url';

// `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle.
export const apiUrl = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  isDev: __DEV__,
});

/** No `getToken` until Firebase Auth reaches the app (E-10): authenticated routes answer 401. */
export const api = createApiClient({ baseUrl: apiUrl });
