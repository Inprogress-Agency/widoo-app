import { describe, expect, it } from 'vitest';
import {
  createRecentZones,
  MAX_RECENT_ZONES,
  readRecentZones,
  withRecentZone,
  type RecentZone,
} from './recentZones';

// Fictitious zones.
const zone = (id: string): RecentZone => ({
  id,
  name: `Zone ${id}`,
  kind: 'neighborhood',
  area: 'Paris 10e',
  center: { lat: 48.87, lng: 2.36 },
  bbox: { west: 2.34, south: 48.86, east: 2.38, north: 48.88 },
});

function memoryStorage(initial?: string) {
  const values = new Map<string, string>(initial ? [['zones', initial]] : []);
  return { getString: (key: string) => values.get(key), set: values.set.bind(values), values };
}

describe('withRecentZone', () => {
  it('puts the zone first, once, and keeps ten', () => {
    const zones = Array.from({ length: MAX_RECENT_ZONES }, (_, index) => zone(String(index)));
    const next = withRecentZone(zones, zone('5'));
    expect(next.map((entry) => entry.id)).toEqual([
      '5',
      '0',
      '1',
      '2',
      '3',
      '4',
      '6',
      '7',
      '8',
      '9',
    ]);
    expect(withRecentZone(zones, zone('new'))).toHaveLength(MAX_RECENT_ZONES);
    expect(withRecentZone(zones, zone('new'))[0]?.id).toBe('new');
  });

  it('keeps what a row needs, never the number of routes', () => {
    const [kept] = withRecentZone([], { ...zone('a'), routeCount: 18 } as RecentZone);
    expect(kept).toEqual(zone('a'));
  });
});

describe('readRecentZones', () => {
  it('drops what is not a zone', () => {
    const stored = JSON.stringify([zone('a'), { id: 'route', title: 'Un parcours' }, 'x']);
    expect(readRecentZones(stored)).toEqual([zone('a')]);
    expect(readRecentZones('not json')).toEqual([]);
    expect(readRecentZones('{"id":"a"}')).toEqual([]);
    expect(readRecentZones(undefined)).toEqual([]);
  });
});

describe('createRecentZones', () => {
  it('keeps the zones on the phone, and tells each change', () => {
    const storage = memoryStorage(JSON.stringify([zone('a')]));
    const recent = createRecentZones(storage);
    let changes = 0;
    recent.subscribe(() => {
      changes += 1;
    });
    recent.add(zone('b'));
    expect(recent.get().map((entry) => entry.id)).toEqual(['b', 'a']);
    recent.remove('a');
    expect(readRecentZones(storage.values.get('zones'))).toEqual([zone('b')]);
    recent.clear();
    expect(recent.get()).toEqual([]);
    expect(changes).toBe(3);
  });
});
