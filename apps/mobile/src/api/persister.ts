import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { createMMKV } from 'react-native-mmkv';
import { queryClient } from './query-client';
import { OFFLINE_MAX_AGE_MS, shouldPersistQuery } from './search-cache';

/** The query cache kept on the device, apart from consent and analytics. */
const storage = createMMKV({ id: 'query-cache' });

/**
 * The last search answered, kept in MMKV so that the sheet shows it offline (Ecrans › E-01).
 * A new version of the app starts from an empty cache: its schema may have changed.
 */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createSyncStoragePersister({
    storage: {
      getItem: (key) => storage.getString(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => {
        storage.remove(key);
      },
    },
  }),
  maxAge: OFFLINE_MAX_AGE_MS,
  buster: Constants.expoConfig?.version ?? 'unknown',
  dehydrateOptions: { shouldDehydrateQuery: (query) => shouldPersistQuery(queryClient, query) },
};
