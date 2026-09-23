import * as Sentry from '@sentry/react-native';
import { monitoringOptions } from './options';

/** Starts crash reporting, before the first render. */
export function initMonitoring() {
  // `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle.
  Sentry.init(
    monitoringOptions({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment: process.env.EXPO_PUBLIC_APP_ENV,
    }),
  );
  // Native crashes skip `beforeSend`, and the native SDKs fill a missing user with their
  // installation id. A constant id leaves them nothing that tells two devices apart.
  Sentry.setUser({ id: 'anonymous' });
}
