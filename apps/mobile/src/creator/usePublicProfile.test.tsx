import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ApiRequestError } from '@widoo/api-client';
import type { PublicProfile } from '@widoo/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { usePublicProfile } from './usePublicProfile';

jest.mock('../api/client', () => ({ api: { getPublicProfile: jest.fn() } }));
jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));

const getPublicProfile = jest.mocked(api.getPublicProfile);
const id = '0b6f6a2e-3c1d-4d8e-9a65-1f2b3c4d5e6f';
const known = { firstName: 'Camille', avatarUrl: null };

/** Just what the hook reads of a profile: its page of routes. */
const page = (titles: string[], nextCursor: string | null) =>
  ({
    kind: 'profile',
    profile: { id, routes: { items: titles.map((title) => ({ title })), nextCursor } },
  }) as unknown as { kind: 'profile'; profile: PublicProfile };

async function renderProfileHook() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePublicProfile(id, { sort: 'recent' }, known), { wrapper });
}

describe('usePublicProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
  });

  it('keeps what is known while loading, then reads the routes page after page', async () => {
    getPublicProfile
      .mockResolvedValueOnce(page(['Canal'], 'c2'))
      .mockResolvedValueOnce(page(['Belleville'], null));
    const { result } = await renderProfileHook();
    expect(result.current.state).toEqual({ status: 'loading', known });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.hasMore).toBe(true);
    await act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.hasMore).toBe(false));
    const { state } = result.current;
    expect(state.status === 'ready' && state.routes.map((route) => route.title)).toEqual([
      'Canal',
      'Belleville',
    ]);
    expect(getPublicProfile).toHaveBeenLastCalledWith(
      id,
      { sort: 'recent', cursor: 'c2' },
      expect.anything(),
    );
  });

  it('answers unavailable for a masked profile or a deleted account', async () => {
    getPublicProfile.mockResolvedValue({ kind: 'unavailable' });
    const { result } = await renderProfileHook();
    await waitFor(() => expect(result.current.state).toEqual({ status: 'unavailable' }));
  });

  it.each([
    ['offline when no answer reached the phone', new ApiRequestError('network', null, null), true],
    ['an error when the API failed', new ApiRequestError('http', 500, null), false],
  ])('says it is %s', async (_case, error, isOffline) => {
    getPublicProfile.mockRejectedValue(error);
    const { result } = await renderProfileHook();
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', isOffline, known }),
    );
  });
});
