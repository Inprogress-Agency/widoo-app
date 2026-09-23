import type { ReactNativeOptions } from '@sentry/react-native';
import { scrubBreadcrumb, scrubEvent } from '@widoo/shared';

interface MonitoringSources {
  /** `EXPO_PUBLIC_SENTRY_DSN`; absent, nothing is reported. */
  dsn: string | undefined;
  /** `EXPO_PUBLIC_APP_ENV`, set per build profile in `eas.json`. */
  environment: string | undefined;
}

/**
 * Crash reports (wiki Securite-et-RGPD: legitimate interest, 90 days) are sent with or without
 * analytics consent, so they never carry user data: no user, no IP address, no screenshot, no
 * request body, no credential. The app has no signed-in user to report yet.
 */
export function monitoringOptions({ dsn, environment }: MonitoringSources): ReactNativeOptions {
  return {
    dsn: dsn || undefined,
    enabled: Boolean(dsn),
    environment: environment || 'development',
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // Release health would send the SDK's installation id (`did`) with every session.
    enableAutoSessionTracking: false,
    beforeSend: (event) => {
      scrubEvent(event, { keepUserId: false });
      return event;
    },
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
