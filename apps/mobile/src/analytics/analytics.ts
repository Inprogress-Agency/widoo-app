import {
  AnalyticsCity,
  checkAnalyticsEvent,
  type AnalyticsCommonProperties,
  type AnalyticsEventArgs,
  type AnalyticsEventName,
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
  /** An event, a property or a city refused by the schema: nothing is sent, the reason told. */
  onInvalid: (error: string) => void;
}

/** The only city at launch, until the explored area sets it. */
const DEFAULT_CITY = 'paris';

/**
 * Product analytics behind consent. Without it, the PostHog client does not exist: no event, no
 * request, no identifier kept on the device. Events and their properties are typed by the
 * catalog of `@widoo/shared`, and checked against it at run time: an event, a property or a
 * value outside the catalog is refused, even with consent, even without key.
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
      const check = checkAnalyticsEvent(event, args[0]);
      if (!check.success) {
        options.onInvalid(check.error);
        return;
      }
      const common: AnalyticsCommonProperties = {
        app_version: options.appVersion,
        platform: options.platform,
        ...context,
      };
      // The schemas only hold strings, numbers, booleans and arrays of them.
      client?.capture(event, { ...(check.properties as Record<string, JsonValue>), ...common });
    },
    /** City slug of the explored area; anything else, a position above all, is refused. */
    setCity(city: string) {
      if (!AnalyticsCity.safeParse(city).success) {
        options.onInvalid('Invalid analytics city: not a slug');
        return;
      }
      context.city = city;
    },
    setAuthenticated(isAuthenticated: boolean) {
      context.is_authenticated = isAuthenticated;
    },
  };
}

export type Analytics = ReturnType<typeof createAnalytics>;

/**
 * A client that writes each event to a log instead of sending it: the local journal of the
 * events in development (`EXPO_PUBLIC_ANALYTICS_DEBUG=1` without PostHog key), behind consent
 * like the real one.
 */
export function createLogClient(log: (line: string) => void): AnalyticsClient {
  return {
    capture: (event, properties) => log(`[analytics] ${event} ${JSON.stringify(properties)}`),
    optIn: async () => {},
    optOut: async () => {},
  };
}
