import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { createAnalytics } from './analytics';
import { createConsentStore } from './consent';

/** PostHog Cloud EU (wiki Securite-et-RGPD): fixed here so that no setting sends data elsewhere. */
const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

// `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle. Set per
// EAS environment, or in `.env.local`; absent, analytics does nothing.
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

// MMKV (Architecture-Technique): read synchronously, so the first render knows the answer.
const consentStorage = createMMKV({ id: 'consent' });
/** PostHog's own storage (anonymous id, queue), separate so that it can be erased alone. */
const posthogStorage = createMMKV({ id: 'posthog' });

export const consent = createConsentStore(consentStorage);

export const analytics = createAnalytics({
  consent,
  createClient:
    posthogKey === undefined || posthogKey === ''
      ? undefined
      : () =>
          new PostHog(posthogKey, {
            host: POSTHOG_EU_HOST,
            customStorage: {
              getItem: (key) => posthogStorage.getString(key) ?? null,
              setItem: (key, value) => posthogStorage.set(key, value),
            },
            // `app_opened` is the app's own event; no lifecycle events, no location from the IP.
            captureAppLifecycleEvents: false,
            disableGeoip: true,
            // No person profile for an anonymous device.
            personProfiles: 'identified_only',
          }),
  clearClientStorage: () => posthogStorage.clearAll(),
  appVersion: Constants.expoConfig?.version ?? 'unknown',
  platform: Platform.OS === 'android' ? 'android' : 'ios',
});

/** Answer to the consent banner, re-rendering when it changes. */
export function useConsent() {
  return useSyncExternalStore(consent.subscribe, consent.get);
}

/**
 * `app_opened`: once per launch when consent is granted (at startup, or when the user accepts),
 * then at each return from the background.
 */
export function useAppOpenedEvent() {
  const isGranted = useConsent() === 'granted';
  useEffect(() => {
    if (!isGranted) {
      return;
    }
    analytics.track('app_opened', { cold_start: true });
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous === 'background' && next === 'active') {
        analytics.track('app_opened', { cold_start: false });
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [isGranted]);
}
