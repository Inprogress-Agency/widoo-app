import type { RouteCard } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { zoneName } from './zone';

// Fictitious routes: only their place and start matter here.
const at = (lat: number, neighborhood: string | null, district: string | null) =>
  ({
    neighborhood,
    district,
    steps: [{ category: 'park', location: { lat, lng: 2.36 } }],
  }) as unknown as RouteCard;

describe('zoneName', () => {
  const user = { lat: 48.867, lng: 2.36 };

  it('names the neighbourhood of the nearest start', () => {
    expect(zoneName([at(48.85, 'Bastille', '11e'), at(48.868, 'République', '10e')], user)).toBe(
      'République',
    );
  });

  it('falls back on the arrondissement, and on nothing', () => {
    expect(zoneName([at(48.868, null, '10e')], user)).toBe('10e');
    expect(zoneName([at(48.868, null, null)], user)).toBeNull();
    expect(zoneName([], user)).toBeNull();
  });
});
