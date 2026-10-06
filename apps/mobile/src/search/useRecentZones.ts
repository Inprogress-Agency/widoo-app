import { useSyncExternalStore } from 'react';
import { createMMKV } from 'react-native-mmkv';
import { createRecentZones, type RecentZone } from './recentZones';

/** Apart from the query cache, so that clearing one never empties the other. */
const storage = createMMKV({ id: 'recent-zones' });

/** The recent zones of the search, read synchronously from MMKV at launch. */
export const recentZones = createRecentZones(storage);

export function useRecentZones(): RecentZone[] {
  return useSyncExternalStore(recentZones.subscribe, recentZones.get);
}
