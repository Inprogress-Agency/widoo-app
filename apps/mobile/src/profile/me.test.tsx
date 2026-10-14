import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  persistQueryClientSave,
  type PersistedClient,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { act } from '@testing-library/react-native';
import { api } from '../api/client';
import { validatingPersister } from '../api/cache-restore';
import { queryClient } from '../api/query-client';
import { shouldPersistQuery } from '../api/search-cache';
import { session } from '../auth';
import { fakeAuth } from '../test/fakeAuth';
import { testMe } from '../test/me';
import { deleteAccount, meQueryKey } from './me';

jest.mock('../analytics', () => ({
  analytics: { track: jest.fn(), setAuthenticated: jest.fn() },
}));
jest.mock('../api/query-client', () => ({
  queryClient: new (jest.requireActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  ).QueryClient)(),
}));
jest.mock('../api/client', () => ({
  api: { getMe: jest.fn(), updateMe: jest.fn(), deleteMe: jest.fn() },
}));

// Fictitious account (Camille), as `GET /me` answers it.
const user = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: null };

/** What the app writes on the device, through the persister of the app, from its cache now. */
async function deviceNow(): Promise<PersistedClient> {
  let stored: PersistedClient | undefined;
  const device: Persister = {
    persistClient: (client) => {
      stored = client;
    },
    restoreClient: () => stored,
    removeClient: () => {
      stored = undefined;
    },
  };
  await persistQueryClientSave({
    queryClient,
    persister: validatingPersister(device),
    dehydrateOptions: { shouldDehydrateQuery: (query) => shouldPersistQuery(queryClient, query) },
  });
  if (!stored) throw new Error('Nothing written');
  return stored;
}

describe('the account kept on the phone', () => {
  beforeEach(async () => {
    await act(() => fakeAuth.setUser(user));
    queryClient.setQueryData(meQueryKey(user.uid), testMe());
  });
  afterEach(() => queryClient.clear());

  it('is written without its e-mail while signed in', async () => {
    const stored = await deviceNow();
    expect(stored.clientState.queries.map((query) => query.queryKey)).toEqual([['me', 'uid-1']]);
    expect(JSON.stringify(stored)).not.toContain(user.email);
    expect(queryClient.getQueryData(meQueryKey(user.uid))).toEqual(testMe());
  });

  it('is forgotten at the sign-out', async () => {
    await act(() => session.signOut());
    expect(queryClient.getQueryData(meQueryKey(user.uid))).toBeUndefined();
    expect((await deviceNow()).clientState.queries).toEqual([]);
  });

  it('is forgotten at the deletion of the account', async () => {
    jest.mocked(api.deleteMe).mockResolvedValue(undefined);
    await act(() => deleteAccount());
    expect(api.deleteMe).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(meQueryKey(user.uid))).toBeUndefined();
    expect((await deviceNow()).clientState.queries).toEqual([]);
  });
});
