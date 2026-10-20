import type { B2bClient } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import {
  centsToEuros,
  emptyPartnerForm,
  eurosToCents,
  partnerFormOf,
  partnerInputOf,
  partnerPatchOf,
  slugFromName,
} from './partner-form';

const partner: B2bClient = {
  id: '0198c1de-0000-7000-8000-000000000001',
  name: 'Hôtel du Nord',
  slug: 'hotel-du-nord',
  type: 'hotel',
  status: 'active',
  monthlyPriceCents: 4950,
  startedAt: '2026-11-01',
  cityNames: ['Paris'],
  routeCount: 3,
  contactName: 'Camille Durand',
  contactEmail: 'camille@hotel.example',
  contactPhone: null,
  address: null,
  notes: null,
  source: 'b2b-hotel-du-nord',
  routes: [],
  createdAt: '2026-10-20T09:00:00.000Z',
};

describe('slugFromName', () => {
  it('writes lowercase words without accents, joined by hyphens', () => {
    expect(slugFromName('Hôtel du Nord')).toBe('hotel-du-nord');
    expect(slugFromName("  L'Office de tourisme — Lyon  ")).toBe('l-office-de-tourisme-lyon');
    expect(slugFromName('')).toBe('');
    expect(slugFromName('x'.repeat(80))).toHaveLength(60);
  });
});

describe('the price', () => {
  it('goes from euros typed to cents and back, without a float', () => {
    expect(eurosToCents('49')).toBe(4900);
    expect(eurosToCents('49,5')).toBe(4950);
    expect(eurosToCents('49.50')).toBe(4950);
    expect(eurosToCents('0,07')).toBe(7);
    expect(eurosToCents('  ')).toBeNull();
    for (const bad of ['abc', '-5', '49,555', '1 000', '49 €']) {
      expect(eurosToCents(bad)).toBe('invalid');
    }
    expect(centsToEuros(4900)).toBe('49');
    expect(centsToEuros(4950)).toBe('49,50');
    expect(centsToEuros(7)).toBe('0,07');
  });
});

describe('partnerInputOf', () => {
  it('reads the form, an empty text as none, and refuses a price it cannot read', () => {
    const form = { ...emptyPartnerForm, name: ' Hôtel ', slug: 'hotel', contactName: '  ' };
    expect(partnerInputOf(form)).toMatchObject({
      name: 'Hôtel',
      slug: 'hotel',
      status: 'prospect',
      contactName: null,
      monthlyPriceCents: null,
    });
    expect(partnerInputOf({ ...form, monthlyPrice: 'beaucoup' })).toBeNull();
  });
});

describe('partnerPatchOf', () => {
  it('holds the fields that changed, never the slug', () => {
    const form = partnerFormOf(partner);
    expect(partnerPatchOf(partner, form)).toEqual({});
    expect(
      partnerPatchOf(partner, { ...form, status: 'suspended', monthlyPrice: '60', slug: 'autre' }),
    ).toEqual({ status: 'suspended', monthlyPriceCents: 6000 });
    expect(partnerPatchOf(partner, { ...form, contactEmail: '' })).toEqual({ contactEmail: null });
    expect(partnerPatchOf(partner, { ...form, monthlyPrice: 'x' })).toBeNull();
  });
});
