import { describe, expect, it } from 'vitest';
import {
  B2bClientInput,
  B2bClientPatch,
  B2bClientRoutesInput,
  B2bSlug,
  b2bSourceOf,
} from './admin-b2b';

const partner = { slug: 'hotel-du-nord', name: 'Hôtel du Nord', type: 'hotel' } as const;
const ids = [
  '0198c1de-0000-7000-8000-000000000001',
  '0198c1de-0000-7000-8000-000000000002',
  '0198c1de-0000-7000-8000-000000000003',
];

describe('B2bClientInput', () => {
  it('takes a partner, a prospect without contact or price unless said otherwise', () => {
    expect(B2bClientInput.parse(partner)).toMatchObject({
      status: 'prospect',
      contactEmail: null,
      monthlyPriceCents: null,
      startedAt: null,
    });
    const full = B2bClientInput.parse({
      ...partner,
      status: 'active',
      contactName: 'Camille Durand',
      contactEmail: 'camille@hotel.example',
      monthlyPriceCents: 4900,
      startedAt: '2026-11-01',
    });
    expect(full).toMatchObject({ status: 'active', monthlyPriceCents: 4900 });
  });

  it('refuses markup, a bad e-mail, a price out of bounds, an unknown type and field', () => {
    expect(B2bClientInput.safeParse({ ...partner, name: '<b>x</b>' }).success).toBe(false);
    expect(B2bClientInput.safeParse({ ...partner, contactEmail: 'not an address' }).success).toBe(
      false,
    );
    expect(B2bClientInput.safeParse({ ...partner, monthlyPriceCents: -1 }).success).toBe(false);
    expect(B2bClientInput.safeParse({ ...partner, monthlyPriceCents: 1e9 }).success).toBe(false);
    expect(B2bClientInput.safeParse({ ...partner, type: 'bank' }).success).toBe(false);
    expect(B2bClientInput.safeParse({ ...partner, extra: 1 }).success).toBe(false);
  });
});

describe('B2bClientPatch', () => {
  it('takes some fields, not none, and never the slug', () => {
    expect(B2bClientPatch.parse({ status: 'suspended' })).toEqual({ status: 'suspended' });
    expect(B2bClientPatch.safeParse({}).success).toBe(false);
    expect(B2bClientPatch.safeParse({ slug: 'other-slug' }).success).toBe(false);
  });
});

describe('B2bSlug', () => {
  it('takes lowercase words joined by single hyphens', () => {
    expect(B2bSlug.safeParse('hotel-du-nord-2').success).toBe(true);
    for (const bad of ['ab', 'Hotel', 'hotel--nord', '-hotel', 'hotel-', 'hôtel', 'a b c']) {
      expect(B2bSlug.safeParse(bad).success).toBe(false);
    }
  });

  it('gives the measurement source written in the QR codes', () => {
    expect(b2bSourceOf('hotel-du-nord')).toBe('b2b-hotel-du-nord');
  });
});

describe('B2bClientRoutesInput', () => {
  it('takes 3 to 10 different routes', () => {
    expect(B2bClientRoutesInput.safeParse({ routeIds: ids }).success).toBe(true);
    expect(B2bClientRoutesInput.safeParse({ routeIds: ids.slice(0, 2) }).success).toBe(false);
    expect(B2bClientRoutesInput.safeParse({ routeIds: [...ids, ids[0]] }).success).toBe(false);
    const idsOf = (count: number) =>
      Array.from(
        { length: count },
        (_, i) => `0198c1de-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
      );
    expect(B2bClientRoutesInput.safeParse({ routeIds: idsOf(10) }).success).toBe(true);
    expect(B2bClientRoutesInput.safeParse({ routeIds: idsOf(11) }).success).toBe(false);
  });
});
