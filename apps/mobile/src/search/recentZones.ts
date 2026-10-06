import { GeocodeZone } from '@widoo/shared';

/** « Recherches récentes » keeps ten zones at most (Ecrans › E-02). */
export const MAX_RECENT_ZONES = 10;

/**
 * A zone chosen in the search, as the phone keeps it: what the row and the framing need, without
 * its number of routes, which would be stale. Only zones: a route opened is not a search.
 */
export const RecentZone = GeocodeZone.pick({
  id: true,
  name: true,
  kind: true,
  area: true,
  center: true,
  bbox: true,
});
export type RecentZone = Pick<GeocodeZone, 'id' | 'name' | 'kind' | 'area' | 'center' | 'bbox'>;

/** The zone chosen first, without its earlier entry, ten at most. */
export function withRecentZone(zones: readonly RecentZone[], zone: RecentZone): RecentZone[] {
  const entry = RecentZone.parse(zone);
  return [entry, ...zones.filter((other) => other.id !== entry.id)].slice(0, MAX_RECENT_ZONES);
}

export function withoutRecentZone(zones: readonly RecentZone[], id: string): RecentZone[] {
  return zones.filter((zone) => zone.id !== id);
}

/**
 * The zones read back from the phone: an entry of another shape, from an older build or written
 * by anything but this module, is dropped rather than shown.
 */
export function readRecentZones(stored: string | undefined): RecentZone[] {
  if (!stored) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .flatMap((entry) => {
      const zone = RecentZone.safeParse(entry);
      return zone.success ? [zone.data] : [];
    })
    .slice(0, MAX_RECENT_ZONES);
}

/** Where the zones are kept: MMKV on the phone, a map in the tests. */
export interface RecentZonesStorage {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
}

const KEY = 'zones';

/**
 * The recent zones of the search, kept on the phone so that they stay without network (Ecrans ›
 * E-02, hors connexion). Subscribers hear of each change.
 */
export function createRecentZones(storage: RecentZonesStorage) {
  let zones = readRecentZones(storage.getString(KEY));
  const listeners = new Set<() => void>();
  const save = (next: RecentZone[]) => {
    zones = next;
    storage.set(KEY, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  };
  return {
    get: () => zones,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    add: (zone: RecentZone) => save(withRecentZone(zones, zone)),
    remove: (id: string) => save(withoutRecentZone(zones, id)),
    clear: () => save([]),
  };
}

export type RecentZones = ReturnType<typeof createRecentZones>;
