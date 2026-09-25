import { describe, expect, it, vi } from 'vitest';
import { createAnalytics, createLogClient, type AnalyticsClient } from './analytics';
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
  const onInvalid = vi.fn();
  const analytics = createAnalytics({
    consent,
    createClient: hasKey ? createClient : undefined,
    clearClientStorage,
    appVersion: '0.1.0',
    platform: 'ios',
    onInvalid,
  });
  return { storage, consent, client, createClient, clearClientStorage, onInvalid, analytics };
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

  it('refuses an event outside the catalog, and sends nothing', () => {
    const { analytics, client, onInvalid } = setup({ stored: 'granted' });
    // @ts-expect-error not in the list of the wiki
    analytics.track('screen_viewed', { screen: 'home' });
    expect(client.capture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith('Unknown analytics event: screen_viewed');
  });

  it('refuses a property or a value outside the schema, and sends nothing', () => {
    const { analytics, client, onInvalid } = setup({ stored: 'granted' });
    // @ts-expect-error unknown property
    analytics.track('app_opened', { cold_start: true, email: 'someone@example.com' });
    // @ts-expect-error value outside the list of the wiki
    analytics.track('route_opened', { route_id: 'route-1', source: 'push' });
    expect(client.capture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenNthCalledWith(1, 'Invalid app_opened: unknown email');
    expect(onInvalid).toHaveBeenCalledTimes(2);
  });

  it('checks the events even without consent', () => {
    const { analytics, onInvalid } = setup();
    // @ts-expect-error unknown property
    analytics.track('create_started', { steps: 1 });
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it('never sends a position as the zone: the map event and the city refuse it', () => {
    const { analytics, client, onInvalid } = setup({ stored: 'granted' });
    analytics.track('map_search_zone', {
      zoom: 14.5,
      results_count: 3,
      trigger: 'initial',
      // @ts-expect-error the zone of the map is never sent
      bbox: [2.33, 48.85, 2.37, 48.88],
    });
    analytics.setCity('48.8566,2.3522');
    analytics.track('create_started');
    expect(onInvalid).toHaveBeenCalledTimes(2);
    expect(client.capture).toHaveBeenCalledOnce();
    expect(client.capture).toHaveBeenCalledWith(
      'create_started',
      expect.objectContaining({ city: 'paris' }),
    );
  });
});

describe('createLogClient', () => {
  it('writes each event and its properties on one line', () => {
    const log = vi.fn();
    createLogClient(log).capture('route_opened', { route_id: 'route-1', source: 'card' });
    expect(log).toHaveBeenCalledWith(
      '[analytics] route_opened {"route_id":"route-1","source":"card"}',
    );
  });
});
