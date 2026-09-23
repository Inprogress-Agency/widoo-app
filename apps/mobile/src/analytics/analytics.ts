import type {
  AnalyticsCommonProperties,
  AnalyticsEventArgs,
  AnalyticsEventName,
} from '@widoo/shared';
import type { ConsentStore } from './consent';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** The part of the PostHog client the app uses. */
export interface AnalyticsClient {
  capture(event: string, properties: { [key: string]: JsonValue }): void;
  optIn(): Promise<void>;
  optOut(): Promise<void>;
}

interface AnalyticsOptions {
  consent: ConsentStore;
  /** Creates the PostHog client once consent is granted. Absent without key: a no-op. */
  createClient: (() => AnalyticsClient) | undefined;
  /** Erases what the SDK persisted (anonymous id, queue) when consent is missing or withdrawn. */
  clearClientStorage: () => void;
  appVersion: string;
  platform: AnalyticsCommonProperties['platform'];
}

/** The only city at launch, until the explored area sets it. */
const DEFAULT_CITY = 'paris';

/**
 * Product analytics behind consent. Without it, the PostHog client does not exist: no event, no
 * request, no identifier kept on the device. Events and their properties are typed by the
 * catalog of `@widoo/shared`.
 */
export function createAnalytics(options: AnalyticsOptions) {
  const { consent, createClient, clearClientStorage } = options;
  const context = { city: DEFAULT_CITY, is_authenticated: false };
  let client: AnalyticsClient | undefined;

  function applyConsent() {
    if (consent.get() === 'granted') {
      if (!client && createClient) {
        client = createClient();
        // Clears an opt-out the SDK may have persisted before a withdrawal.
        void client.optIn();
      }
      return;
    }
    if (client) {
      void client.optOut();
      client = undefined;
    }
    clearClientStorage();
  }
  applyConsent();
  consent.subscribe(applyConsent);

  return {
    track<E extends AnalyticsEventName>(event: E, ...args: AnalyticsEventArgs<E>) {
      const common: AnalyticsCommonProperties = {
        app_version: options.appVersion,
        platform: options.platform,
        ...context,
      };
      client?.capture(event, { ...args[0], ...common });
    },
    /** City slug of the explored area. */
    setCity(city: string) {
      context.city = city;
    },
    setAuthenticated(isAuthenticated: boolean) {
      context.is_authenticated = isAuthenticated;
    },
  };
}

export type Analytics = ReturnType<typeof createAnalytics>;
