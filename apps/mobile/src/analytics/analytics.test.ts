import { describe, expect, it, vi } from 'vitest';
import { createAnalytics, type AnalyticsClient } from './analytics';
import { createConsentStore, type ConsentStatus } from './consent';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => void values.set(key, value),
  };
}

/** A consent store, a mocked PostHog client and the analytics module on top. */
function setup({ stored, hasKey = true }: { stored?: ConsentStatus; hasKey?: boolean } = {}) {
  const storage = memoryStorage(stored && { 'consent.analytics.v1': stored });
  const consent = createConsentStore(storage);
  const client = {
    capture: vi.fn<AnalyticsClient['capture']>(),
    optIn: vi.fn(async () => {}),
    optOut: vi.fn(async () => {}),
  };
  const createClient = vi.fn(() => client);
  const clearClientStorage = vi.fn();
  const analytics = createAnalytics({
    consent,
    createClient: hasKey ? createClient : undefined,
    clearClientStorage,
    appVersion: '0.1.0',
    platform: 'ios',
  });
  return { storage, consent, client, createClient, clearClientStorage, analytics };
}

describe('createConsentStore', () => {
  it('reads the stored answer, and nothing when absent or unknown', () => {
    const read = (value?: string) =>
      createConsentStore(memoryStorage(value ? { 'consent.analytics.v1': value } : {})).get();
    expect(read('granted')).toBe('granted');
    expect(read('denied')).toBe('denied');
    expect(read()).toBeUndefined();
    expect(read('yes')).toBeUndefined();
  });

  it('persists an answer and notifies the subscribers', () => {
    const storage = memoryStorage();
    const consent = createConsentStore(storage);
    const listener = vi.fn();
    const unsubscribe = consent.subscribe(listener);
    consent.set('denied');
    expect(storage.values.get('consent.analytics.v1')).toBe('denied');
    expect(consent.get()).toBe('denied');
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    consent.set('granted');
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('createAnalytics', () => {
  it('creates no client and sends no event after a refusal', () => {
    const { consent, analytics, createClient, client, clearClientStorage } = setup();
    consent.set('denied');
    analytics.track('app_opened', { cold_start: true });
    expect(createClient).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
    expect(clearClientStorage).toHaveBeenCalled();
  });

  it('creates no client and sends no event before an answer', () => {
    const { analytics, createClient, client } = setup();
    analytics.track('app_opened', { cold_start: true });
    expect(createClient).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });

  it('sends an event with the common properties once consent is given', () => {
    const { consent, analytics, createClient, client } = setup();
    consent.set('granted');
    analytics.track('app_opened', { cold_start: true });
    expect(createClient).toHaveBeenCalledOnce();
    expect(client.optIn).toHaveBeenCalledOnce();
    expect(client.capture).toHaveBeenCalledWith('app_opened', {
      cold_start: true,
      app_version: '0.1.0',
      platform: 'ios',
      city: 'paris',
      is_authenticated: false,
    });
  });

  it('keeps a stored consent across launches, with one client', () => {
    const { analytics, createClient, client } = setup({ stored: 'granted' });
    analytics.setCity('lyon');
    analytics.setAuthenticated(true);
    analytics.track('create_started');
    analytics.track('route_shared', { route_id: 'route-1' });
    expect(createClient).toHaveBeenCalledOnce();
    expect(client.capture).toHaveBeenNthCalledWith(
      1,
      'create_started',
      expect.objectContaining({ city: 'lyon', is_authenticated: true }),
    );
    expect(client.capture).toHaveBeenCalledTimes(2);
  });

  it('stops and forgets the client when consent is withdrawn', () => {
    const { consent, analytics, client, clearClientStorage } = setup({ stored: 'granted' });
    consent.set('denied');
    analytics.track('app_opened', { cold_start: false });
    expect(client.optOut).toHaveBeenCalledOnce();
    expect(clearClientStorage).toHaveBeenCalledOnce();
    expect(client.capture).not.toHaveBeenCalled();
  });

  it('is a no-op without PostHog key, even with consent', () => {
    const { analytics } = setup({ stored: 'granted', hasKey: false });
    expect(() => analytics.track('app_opened', { cold_start: true })).not.toThrow();
  });
});
