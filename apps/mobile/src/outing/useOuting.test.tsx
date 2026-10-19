import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { PlannedRoute } from '@widoo/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { plannedFixture } from '../go/testPlanned';
import { plannedQueryKey } from '../plan/planned';
import { fakeAuth } from '../test/fakeAuth';
import { useOuting } from './useOuting';

jest.mock('../api/client', () => ({ api: { getPlanned: jest.fn() } }));
jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));

const getPlanned = jest.mocked(api.getPlanned);
const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };
const outing: PlannedRoute = { ...plannedFixture(), status: 'planned' };

async function renderOutingHook(listed: PlannedRoute[] | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (listed) {
    client.setQueryData(plannedQueryKey(user.uid), { items: listed, nextCursor: null });
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...(await renderHook(() => useOuting(outing.id), { wrapper })) };
}

describe('useOuting', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    await act(() => fakeAuth.setUser(user));
  });

  it('gives the outing of « À venir » at once, then reads it again', async () => {
    const moved = { ...outing, startsAt: '2026-10-25T08:00:00.000Z' };
    let answer: (value: PlannedRoute) => void = () => undefined;
    getPlanned.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { result } = await renderOutingHook([outing]);
    expect(result.current.outing).toEqual(outing);
    await act(async () => answer(moved));
    await waitFor(() => expect(result.current.outing).toEqual(moved));
    expect(getPlanned).toHaveBeenCalledWith(outing.id, expect.anything());
  });

  it('reads an outing the lists do not hold, null while it loads', async () => {
    getPlanned.mockResolvedValue(outing);
    const { result } = await renderOutingHook(null);
    expect(result.current).toMatchObject({ outing: null, isError: false });
    await waitFor(() => expect(result.current.outing).toEqual(outing));
  });

  it('fails only without an outing to show, and asks again on retry', async () => {
    getPlanned.mockRejectedValueOnce(new ApiRequestError('http', 500, null));
    const { result } = await renderOutingHook(null);
    await waitFor(() => expect(result.current.isError).toBe(true));
    getPlanned.mockResolvedValue(outing);
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current).toMatchObject({ outing, isError: false }));
  });

  it('reads it again with the plannings, which « Annuler » and « Programmer » refresh', async () => {
    getPlanned.mockResolvedValue(outing);
    const { client, result } = await renderOutingHook([outing]);
    await waitFor(() => expect(getPlanned).toHaveBeenCalledTimes(1));
    getPlanned.mockResolvedValue({ ...outing, status: 'cancelled' });
    await act(() => client.invalidateQueries({ queryKey: plannedQueryKey(user.uid) }));
    await waitFor(() => expect(result.current.outing?.status).toBe('cancelled'));
  });
});
