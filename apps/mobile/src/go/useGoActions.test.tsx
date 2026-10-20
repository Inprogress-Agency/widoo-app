import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { PlannedRoute } from '@widoo/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { queryClient } from '../api/query-client';
import { fakeAuth } from '../test/fakeAuth';
import { toastStore } from '../ui/toastStore';
import type { GoProgress } from './progress';
import { plannedFixture, stepIds } from './testPlanned';
import { goLocal, GoSync, useGo, useGoActions } from './useGo';

jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)({ defaultOptions: { queries: { retry: false } } }),
}));
jest.mock('../api/client', () => ({
  api: {
    listPlanned: jest.fn(),
    markPlannedStepArrived: jest.fn(),
    markPlannedStepDone: jest.fn(),
    skipPlannedStep: jest.fn(),
    unskipPlannedStep: jest.fn(),
  },
}));
jest.mock('react-native-mmkv', () => jest.requireActual('../test/mmkv'));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mocked = jest.mocked(api);
// Fictitious account (Camille).
const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const page = (items: unknown[]) => ({ items, nextCursor: null }) as never;
const at = '2026-10-24T08:30:00.000Z';
const unreachable = () => new ApiRequestError('network', null, null);

function Commands({ planned, progress }: { planned: PlannedRoute; progress: GoProgress }) {
  const actions = useGoActions(planned, progress);
  return (
    <>
      <Text>{`${progress.current?.index ?? 'end'} ${progress.phase}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => void actions.arrive(false)}>
        <Text>arrive</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void actions.skip('late')}>
        <Text>skip</Text>
      </Pressable>
    </>
  );
}

function Go() {
  const { planned, progress } = useGo();
  return (
    <>
      <GoSync />
      {planned && progress && <Commands planned={planned} progress={progress} />}
    </>
  );
}

const renderGo = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <Go />
    </QueryClientProvider>,
  );

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe("« J'y suis » of the Go", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    goLocal.clear();
    mocked.listPlanned.mockResolvedValue(page([plannedFixture()]));
    await act(() => fakeAuth.setUser(user));
  });
  afterEach(() => {
    onlineManager.setOnline(true);
    queryClient.clear();
  });

  it('is written by the API, which another phone of the account reads', async () => {
    mocked.markPlannedStepArrived.mockResolvedValue(plannedFixture({ 0: { arrivedAt: at } }));
    await renderGo();
    await fireEvent.press(await screen.findByRole('button', { name: 'arrive' }));
    expect(mocked.markPlannedStepArrived).toHaveBeenCalledWith(
      '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e30',
      stepIds[0],
    );
    expect(await screen.findByText('0 on_site')).toBeTruthy();
    expect(goLocal.localOf(plannedFixture().id).pending).toEqual([]);
    expect(analytics.track).toHaveBeenCalledWith('go_arrived', {
      route_id: plannedFixture().route.id,
      step_index: 0,
      suggested: false,
    });
  });

  it('is kept offline, on site at once, and sent at the return of the network', async () => {
    await renderGo();
    await screen.findByRole('button', { name: 'arrive' });
    await act(() => onlineManager.setOnline(false));
    await fireEvent.press(screen.getByRole('button', { name: 'arrive' }));
    expect(mocked.markPlannedStepArrived).not.toHaveBeenCalled();
    expect(screen.getByText('0 on_site')).toBeTruthy();
    expect(toastStore.getState().toast?.title).toBe('Réponse gardée, envoyée au retour du réseau');

    // Back online, the API answers the arrival, and lists it from then on.
    mocked.markPlannedStepArrived.mockResolvedValue(plannedFixture({ 0: { arrivedAt: at } }));
    mocked.listPlanned.mockResolvedValue(page([plannedFixture({ 0: { arrivedAt: at } })]));
    await act(() => onlineManager.setOnline(true));
    await settle();
    expect(mocked.markPlannedStepArrived).toHaveBeenCalledTimes(1);
    expect(goLocal.localOf(plannedFixture().id).pending).toEqual([]);
    expect(screen.getByText('0 on_site')).toBeTruthy();
  });

  it('leaves once the API answers the Go again, the phone online all along', async () => {
    mocked.markPlannedStepArrived.mockRejectedValue(unreachable());
    await renderGo();
    await fireEvent.press(await screen.findByRole('button', { name: 'arrive' }));
    await settle();
    expect(goLocal.localOf(plannedFixture().id).pending).toHaveLength(1);

    // The API is back: a read of the Go (a change of tab, the app back) sends what was kept.
    mocked.markPlannedStepArrived.mockResolvedValue(plannedFixture({ 0: { arrivedAt: at } }));
    mocked.listPlanned.mockResolvedValue(page([plannedFixture({ 0: { arrivedAt: at } })]));
    await act(() => queryClient.invalidateQueries());
    await settle();
    expect(goLocal.localOf(plannedFixture().id).pending).toEqual([]);
  });

  it('stays kept when the network fails on the way, and leaves at its return', async () => {
    mocked.markPlannedStepArrived.mockRejectedValue(unreachable());
    await renderGo();
    await fireEvent.press(await screen.findByRole('button', { name: 'arrive' }));
    await settle();
    expect(toastStore.getState().toast?.title).toBe('Réponse gardée, envoyée au retour du réseau');
    expect(goLocal.localOf(plannedFixture().id).pending.map((entry) => entry.action)).toEqual([
      'arrived',
    ]);
    expect(screen.getByText('0 on_site')).toBeTruthy();

    mocked.markPlannedStepArrived.mockResolvedValue(plannedFixture({ 0: { arrivedAt: at } }));
    await act(() => onlineManager.setOnline(false));
    await act(() => onlineManager.setOnline(true));
    await settle();
    expect(goLocal.localOf(plannedFixture().id).pending).toEqual([]);
  });
});

describe('« Passer cette étape » and its « Annuler »', () => {
  const id = plannedFixture().id;
  beforeEach(async () => {
    jest.clearAllMocks();
    goLocal.clear();
    mocked.listPlanned.mockResolvedValue(page([plannedFixture()]));
    await act(() => fakeAuth.setUser(user));
  });
  afterEach(() => {
    onlineManager.setOnline(true);
    queryClient.clear();
  });

  it('skips without a confirmation, and « Annuler » brings the step back', async () => {
    mocked.skipPlannedStep.mockResolvedValue(plannedFixture({ 0: { skippedAt: at } }));
    mocked.unskipPlannedStep.mockResolvedValue(plannedFixture());
    await renderGo();
    await fireEvent.press(await screen.findByRole('button', { name: 'skip' }));
    expect(mocked.skipPlannedStep).toHaveBeenCalledWith(id, stepIds[0]);
    expect(await screen.findByText('1 en_route')).toBeTruthy();
    expect(analytics.track).toHaveBeenCalledWith('go_step_skipped', {
      route_id: plannedFixture().route.id,
      step_index: 0,
      reason: 'late',
    });
    const toast = toastStore.getState().toast;
    expect(toast?.title).toBe('Place fictive passé');
    expect(toast?.subtitle).toMatch(/^Fin vers \d\d:\d\d$/);
    expect(toast?.action?.label).toBe('Annuler');

    await act(async () => toast?.action?.onPress());
    await settle();
    expect(mocked.unskipPlannedStep).toHaveBeenCalledWith(id, stepIds[0]);
    expect(screen.getByText('0 en_route')).toBeTruthy();
  });

  it('keeps an action behind one the API did not answer, and says so', async () => {
    mocked.skipPlannedStep.mockRejectedValue(unreachable());
    await renderGo();
    await fireEvent.press(await screen.findByRole('button', { name: 'skip' }));
    await settle();
    expect(toastStore.getState().toast?.title).toBe('Place fictive passé');
    await fireEvent.press(screen.getByRole('button', { name: 'arrive' }));
    await settle();
    // The skip was tried again before it, in vain: both wait for the network.
    expect(mocked.skipPlannedStep.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(goLocal.localOf(id).pending.map((entry) => entry.action)).toEqual(['skip', 'arrived']);
    expect(toastStore.getState().toast?.title).toBe('Réponse gardée, envoyée au retour du réseau');
    expect(screen.getByText('1 on_site')).toBeTruthy();
  });

  it('is kept offline, « Annuler » included, and sends nothing once undone', async () => {
    await renderGo();
    await screen.findByRole('button', { name: 'skip' });
    await act(() => onlineManager.setOnline(false));
    await fireEvent.press(screen.getByRole('button', { name: 'skip' }));
    expect(screen.getByText('1 en_route')).toBeTruthy();
    expect(goLocal.localOf(id).pending.map((entry) => entry.action)).toEqual(['skip']);
    await act(async () => toastStore.getState().toast?.action?.onPress());
    expect(goLocal.localOf(id).pending).toEqual([]);
    expect(screen.getByText('0 en_route')).toBeTruthy();
    await act(() => onlineManager.setOnline(true));
    await settle();
    expect(mocked.skipPlannedStep).not.toHaveBeenCalled();
    expect(mocked.unskipPlannedStep).not.toHaveBeenCalled();
  });
});
