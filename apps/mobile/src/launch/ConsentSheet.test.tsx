import { beforeEach, describe, expect, it, jest } from '@jest/globals';
// After `@jest/globals`: the mock of gorhom, hoisted, needs `jest`.
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ConsentStatus, ConsentStore } from '../analytics/consent';
import { ConsentSheet } from './ConsentSheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useIsFocused: () => true }));
// The consent store of the app over a map instead of MMKV; `accept` and `refuse` record as the
// analytics module does, whose events are tested with it.
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
    analytics: {
      accept: jest.fn(() => store.set('granted')),
      refuse: jest.fn(() => store.set('denied')),
    },
    consent: {
      get: () => store.get(),
      set: (status: ConsentStatus) => store.set(status),
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

const { consent, analytics } = jest.requireMock<{
  consent: ConsentStore & { reset(): void };
  analytics: { accept: jest.Mock; refuse: jest.Mock };
}>('../analytics');
const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

describe('ConsentSheet', () => {
  beforeEach(() => {
    consent.reset();
    jest.clearAllMocks();
  });

  it('waits for a loaded home, then rises once', async () => {
    const present = jest.spyOn(BottomSheetModal.prototype, 'present');
    const view = await render(<ConsentSheet isHomeReady={false} />);
    expect(present).not.toHaveBeenCalled();
    await view.rerender(<ConsentSheet isHomeReady />);
    expect(present).toHaveBeenCalledTimes(1);
    present.mockRestore();
  });

  it('is not asked again once answered', async () => {
    consent.set('denied');
    const present = jest.spyOn(BottomSheetModal.prototype, 'present');
    await render(<ConsentSheet isHomeReady />);
    expect(present).not.toHaveBeenCalled();
    present.mockRestore();
  });

  it('asks with the title, the texts, the policy and two buttons', async () => {
    await render(<ConsentSheet isHomeReady />);
    expect(screen.getByRole('header', { name: "Mesure d'audience" })).toBeOnTheScreen();
    expect(screen.getByText(/avec PostHog, hébergé dans l'Union européenne/)).toBeOnTheScreen();
    expect(screen.getByText("Vous pourrez changer d'avis dans les Réglages.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Accepter' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Politique de confidentialité' }));
    expect(router.push).toHaveBeenCalledWith('/settings/privacy-policy');
  });

  it.each<[string, 'accept' | 'refuse', ConsentStatus]>([
    ['Accepter', 'accept', 'granted'],
    ['Refuser', 'refuse', 'denied'],
  ])('records « %s » and goes away', async (label, answer, status) => {
    const dismiss = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    await render(<ConsentSheet isHomeReady />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: label }));
    });
    expect(analytics[answer]).toHaveBeenCalledTimes(1);
    expect(consent.get()).toBe(status);
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });
});
