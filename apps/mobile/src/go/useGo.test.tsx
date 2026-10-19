import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { fakeAuth } from '../test/fakeAuth';
import { MiniPlayer } from './MiniPlayer';
import { plannedFixture } from './testPlanned';
import { useReadGoOnTabChange } from './useGo';

jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)({ defaultOptions: { queries: { retry: false } } }),
}));
jest.mock('../api/client', () => ({ api: { listPlanned: jest.fn() } }));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const listPlanned = jest.mocked(api.listPlanned);
// Fictitious account (Camille).
const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const page = (items: unknown[]) => ({ items, nextCursor: null }) as never;

/** The tab bar as far as the Go goes: the mini-player, read again as the tab changes. */
function TabBarGo({ tab }: { tab: number }) {
  useReadGoOnTabChange(tab);
  return <MiniPlayer />;
}

const renderAt = (tab: number) =>
  render(
    <QueryClientProvider client={queryClient}>
      <TabBarGo tab={tab} />
    </QueryClientProvider>,
  );

const miniPlayer = () => screen.queryByRole('button', { name: /^Parcours en cours/ });

describe('the Go read again at a change of tab', () => {
  beforeEach(async () => {
    listPlanned.mockReset();
    await act(() => fakeAuth.setUser(user));
  });
  afterEach(() => {
    onlineManager.setOnline(true);
    queryClient.clear();
  });

  it('closes the mini-player once the Go was stopped elsewhere', async () => {
    listPlanned.mockResolvedValue(page([plannedFixture()]));
    const view = await renderAt(0);
    expect(await screen.findByRole('button', { name: /^Parcours en cours/ })).toBeTruthy();
    // Stopped on another phone: the API lists no Go in progress any more.
    listPlanned.mockResolvedValue(page([]));
    await view.rerender(
      <QueryClientProvider client={queryClient}>
        <TabBarGo tab={1} />
      </QueryClientProvider>,
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(listPlanned).toHaveBeenCalledTimes(2);
    expect(miniPlayer()).toBeNull();
  });

  it('asks nothing offline, and keeps the Go of the phone', async () => {
    listPlanned.mockResolvedValue(page([plannedFixture()]));
    const view = await renderAt(0);
    expect(await screen.findByRole('button', { name: /^Parcours en cours/ })).toBeTruthy();
    onlineManager.setOnline(false);
    await view.rerender(
      <QueryClientProvider client={queryClient}>
        <TabBarGo tab={2} />
      </QueryClientProvider>,
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(listPlanned).toHaveBeenCalledTimes(1);
    expect(miniPlayer()).not.toBeNull();
  });
});
