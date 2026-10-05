import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
  type PersistedClient,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { RouteCard, type RouteSearchResult } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { readPersistedClient, validatingPersister } from './cache-restore';
import { OFFLINE_MAX_AGE_MS, shouldPersistQuery } from './search-cache';

// Fictitious routes.
const step = (n: number) => ({
  category: 'museum' as const,
  location: { lat: 48.86 + n / 100, lng: 2.34 },
  name: `Étape fictive ${n}`,
  durationMin: 30,
});

const free: RouteCard = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Parcours fictif',
  coverUrl: null,
  isOfficial: true,
  author: null,
  access: 'free',
  isVerified: false,
  moods: ['culture'],
  audiences: [],
  conditions: [],
  transport: 'walk',
  district: '3e',
  neighborhood: 'Le Marais',
  durationMin: 90,
  durationBucket: '1_2h',
  budgetPerPersonEur: 12,
  budgetBucket: 'low',
  distanceM: 1500,
  rating: { average: null, count: 0 },
  isLocked: false,
  stepCount: 3,
  steps: [step(1), step(2), step(3)],
};

/** A Premium card locked for the caller, as the search sends it: its start alone (D-075). */
const locked: RouteCard = {
  ...free,
  id: '00000000-0000-4000-8000-000000000002',
  access: 'premium',
  isLocked: true,
  steps: [{ ...step(1), name: null, durationMin: null }],
};

const answer = <T>(items: T[]) => ({ items, nextCursor: null, clusters: null });

/** A card as the API sent it before #161, #208 and #218: every step, no count, a range. */
function olderCard(card: RouteCard, ...changes: ('isLocked' | 'stepCount' | 'budget')[]) {
  const older: Record<string, unknown> = { ...card };
  if (changes.includes('isLocked')) delete older.isLocked;
  if (changes.includes('stepCount')) delete older.stepCount;
  if (changes.includes('budget')) older.budgetPerPersonEur = { min: 10, max: 14 };
  return older;
}

/** A Premium card of the API before #208: no `isLocked`, and every step of the route. */
const olderPremium = olderCard({ ...free, access: 'premium' }, 'isLocked', 'stepCount', 'budget');

const buster = '1.0.0';
const searchKey = ['routes', 'search', [2.33, 48.85, 2.37, 48.88], {}];

/** A device storage in memory, holding what the app wrote at its last launch. */
function memoryPersister(stored?: unknown) {
  const device = { stored, removed: false };
  const persister: Persister = {
    persistClient: (client) => {
      device.stored = client;
    },
    restoreClient: () => device.stored as PersistedClient | undefined,
    removeClient: () => {
      device.stored = undefined;
      device.removed = true;
    },
  };
  return { device, persister };
}

/** What the app writes on the device after a search answered with `data`. */
async function savedWith(data: unknown): Promise<PersistedClient> {
  const client = new QueryClient();
  client.setQueryData(searchKey, data);
  const { device, persister } = memoryPersister();
  await persistQueryClientSave({
    queryClient: client,
    persister,
    buster,
    dehydrateOptions: { shouldDehydrateQuery: (query) => shouldPersistQuery(client, query) },
  });
  return device.stored as PersistedClient;
}

/** A launch of the app on the stored cache: what the search query then holds. */
async function launchOn(stored: unknown) {
  const client = new QueryClient();
  const { device, persister } = memoryPersister(stored);
  await persistQueryClientRestore({
    queryClient: client,
    persister: validatingPersister(persister),
    buster,
    maxAge: OFFLINE_MAX_AGE_MS,
  });
  return { data: client.getQueryData(searchKey), device };
}

describe('restore of the cache kept on the device', () => {
  it('serves a valid search as before', async () => {
    const data: RouteSearchResult = answer([free, locked]);
    const stored = await savedWith(data);
    const { data: restored, device } = await launchOn(stored);
    expect(restored).toEqual(data);
    expect(device.removed).toBe(false);
    expect(device.stored).toBe(stored);
  });

  it.each([
    ['a card without isLocked', [olderCard(free, 'isLocked')]],
    ['a Premium card without isLocked, all its steps sent', [olderPremium]],
    ['a card without stepCount', [olderCard(free, 'stepCount')]],
    ['a budget as a range', [olderCard(free, 'budget')]],
    ['a valid card next to an older one', [locked, olderCard(free, 'stepCount')]],
  ])('never serves %s, and removes it from the device', async (_, items) => {
    const { data, device } = await launchOn(await savedWith(answer(items)));
    expect(data).toBeUndefined();
    expect(device.removed).toBe(true);
    expect(device.stored).toBeUndefined();
  });

  it('never reads an unlocked Premium card out of an older one', () => {
    // The map draws a card by `isLocked` (D-075): an older card must fail, not default to false.
    expect(RouteCard.safeParse(olderCard(locked, 'isLocked')).success).toBe(false);
    expect(RouteCard.safeParse(olderPremium).success).toBe(false);
  });

  it('keeps the queries that read, and writes back only them', async () => {
    const stored = await savedWith(answer([free]));
    const other = { ...stored.clientState.queries[0], queryKey: ['me'], queryHash: '["me"]' };
    const older = {
      ...stored.clientState.queries[0],
      queryKey: [...searchKey, 'older'],
      queryHash: 'older',
      state: { ...stored.clientState.queries[0]?.state, data: answer([olderPremium]) },
    };
    const mixed = {
      ...stored,
      clientState: {
        ...stored.clientState,
        queries: [...stored.clientState.queries, other, older],
      },
    };
    const { data, device } = await launchOn(mixed);
    expect(data).toEqual(answer([free]));
    expect(device.removed).toBe(false);
    expect((device.stored as PersistedClient).clientState.queries).toHaveLength(1);
  });

  it('starts without cache from a storage it cannot read', async () => {
    for (const stored of [null, 'text', { clientState: {} }, { clientState: { queries: 1 } }]) {
      const { data, device } = await launchOn(stored);
      expect(data).toBeUndefined();
      expect(device.removed).toBe(true);
    }
    const failing = memoryPersister().persister;
    failing.restoreClient = () => {
      throw new SyntaxError('Unexpected token');
    };
    await expect(validatingPersister(failing).restoreClient()).resolves.toBeUndefined();
  });

  it('starts without cache from an empty device', async () => {
    const { data, device } = await launchOn(undefined);
    expect(data).toBeUndefined();
    expect(device.removed).toBe(false);
  });

  it('reads back every query the app writes on the device', async () => {
    // A query kept on the device without a schema to read it would be dropped at each launch:
    // persisting another kind of query requires its schema in `persistedQuerySchema`.
    const stored = await savedWith(answer([free, locked]));
    expect(stored.clientState.queries).toHaveLength(1);
    expect(readPersistedClient(stored)?.dropped).toBe(0);
  });
});
