/** Answer to the consent banner. Absent until the user answers: nothing is sent meanwhile. */
export type ConsentStatus = 'granted' | 'denied';

/** Synchronous key-value storage: MMKV in the app, a map in the tests. */
export interface KeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

// Versioned: a new purpose or processor asks again under a new key.
const CONSENT_KEY = 'consent.analytics.v1';

export interface ConsentStore {
  get(): ConsentStatus | undefined;
  set(status: ConsentStatus): void;
  /** For `useSyncExternalStore`: called after every change. */
  subscribe(listener: () => void): () => void;
}

/** Consent to product analytics (wiki Securite-et-RGPD), read synchronously at startup. */
export function createConsentStore(storage: KeyValueStorage): ConsentStore {
  const stored = storage.getString(CONSENT_KEY);
  let status: ConsentStatus | undefined =
    stored === 'granted' || stored === 'denied' ? stored : undefined;
  const listeners = new Set<() => void>();
  return {
    get: () => status,
    set(next) {
      storage.set(CONSENT_KEY, next);
      status = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
