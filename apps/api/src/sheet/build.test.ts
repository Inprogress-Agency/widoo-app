import { describe, expect, it } from 'vitest';
import { sheetBookingOf, sheetTransitionOf } from './build';

describe('sheetTransitionOf', () => {
  it('serves the line of a trip the provider computed, for this answer only (D-088)', () => {
    const exact = { distanceM: 820, durationMin: 11, mode: 'walk', estimated: false } as const;
    expect(sheetTransitionOf({ ...exact, geometry: 'a~l~Fjk~uOwHJ' })).toEqual({
      ...exact,
      geometry: 'a~l~Fjk~uOwHJ',
    });
  });

  it('serves our estimate without a line when the provider did not answer', () => {
    const estimated = { distanceM: 820, durationMin: 11, mode: 'bike', estimated: true } as const;
    expect(sheetTransitionOf(estimated)).toEqual({ ...estimated, geometry: null });
  });

  it('says the metro is estimated, never asked of the provider', () => {
    const metro = { distanceM: 4200, durationMin: 21, mode: 'metro', estimated: false } as const;
    expect(sheetTransitionOf(metro)).toEqual({ ...metro, estimated: true, geometry: null });
  });

  it('serves no trip after the last step', () => {
    expect(sheetTransitionOf(null)).toBeNull();
  });
});

describe('sheetBookingOf', () => {
  const creator = { bookingUrl: 'https://creator.example/book', bookingIsAffiliate: false };
  const none = { bookingUrl: null, bookingIsAffiliate: false };
  const partnerPlace = { partnerBookingUrl: 'https://partner.example/place' };

  it('serves the link of the creator first, an affiliate one flagged as such', () => {
    expect(sheetBookingOf(creator, partnerPlace, true)).toEqual({
      bookingUrl: 'https://creator.example/book',
      bookingIsAffiliate: false,
    });
    expect(sheetBookingOf({ ...creator, bookingIsAffiliate: true }, partnerPlace, true)).toEqual({
      bookingUrl: 'https://creator.example/book',
      bookingIsAffiliate: true,
    });
  });

  it('falls back on the partner link of Widoo, which is an affiliate link', () => {
    expect(sheetBookingOf(none, partnerPlace, true)).toEqual({
      bookingUrl: 'https://partner.example/place',
      bookingIsAffiliate: true,
    });
    expect(sheetBookingOf(none, partnerPlace, null)).toMatchObject({ bookingIsAffiliate: true });
  });

  it('serves no partner link of a program that is switched off, nor a link without https', () => {
    expect(sheetBookingOf(none, partnerPlace, false)).toEqual({
      bookingUrl: null,
      bookingIsAffiliate: false,
    });
    expect(
      sheetBookingOf(
        { bookingUrl: 'http://creator.example', bookingIsAffiliate: true },
        partnerPlace,
        true,
      ),
    ).toEqual({ bookingUrl: null, bookingIsAffiliate: false });
    expect(sheetBookingOf(none, { partnerBookingUrl: null }, null)).toEqual({
      bookingUrl: null,
      bookingIsAffiliate: false,
    });
  });
});
