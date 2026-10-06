import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ConsentStatus, ConsentStore } from '../analytics/consent';
import { ConsentBanner } from './ConsentBanner';

// The consent store of the app, over a map instead of MMKV: what the banner records is read back.
jest.mock('../analytics', () => {
  const { useSyncExternalStore } = jest.requireActual<typeof import('react')>('react');
  const { createConsentStore } =
    jest.requireActual<typeof import('../analytics/consent')>('../analytics/consent');
  const storage = new Map<string, string>();
  const keyValues = {
    getString: (key: string) => storage.get(key),
    set: (key: string, value: string) => storage.set(key, value),
  };
  let store: ConsentStore = createConsentStore(keyValues);
  return {
    storage,
    consent: {
      get: () => store.get(),
      set: (status: ConsentStatus) => store.set(status),
      subscribe: (listener: () => void) => store.subscribe(listener),
      reset: () => {
        storage.clear();
        store = createConsentStore(keyValues);
      },
    },
    useConsent: () =>
      useSyncExternalStore(
        (listener) => store.subscribe(listener),
        () => store.get(),
      ),
  };
});

const { consent, storage } = jest.requireMock<{
  consent: ConsentStore & { reset(): void };
  storage: Map<string, string>;
}>('../analytics');

describe('ConsentBanner', () => {
  beforeEach(() => {
    consent.reset();
  });

  it('asks with a title and two buttons, « Refuser » and « Accepter »', async () => {
    await render(<ConsentBanner />);
    expect(screen.getByRole('header', { name: "Mesure d'audience" })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Accepter' })).toBeOnTheScreen();
  });

  it.each<[string, ConsentStatus]>([
    ['Accepter', 'granted'],
    ['Refuser', 'denied'],
  ])('records « %s » and goes away', async (label, status) => {
    await render(<ConsentBanner />);
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(consent.get()).toBe(status);
    expect([...storage.values()]).toEqual([status]);
    expect(screen.queryByRole('button', { name: label })).not.toBeOnTheScreen();
  });
});
