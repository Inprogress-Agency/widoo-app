import { describe, expect, it } from 'vitest';
import { derivedConditionsOf, mainTransportOf } from './derived';

const indoor = { bookingRequired: false, isIndoor: true };
const outdoor = { bookingRequired: false, isIndoor: false };

describe('derivedConditionsOf', () => {
  it('derives no_booking and the side most steps are on', () => {
    expect(derivedConditionsOf([indoor, indoor, outdoor])).toEqual(['no_booking', 'indoor']);
    expect(derivedConditionsOf([indoor, outdoor, outdoor])).toEqual(['no_booking', 'outdoor']);
  });

  it('derives neither side half and half, and no no_booking with a booking', () => {
    expect(derivedConditionsOf([{ ...indoor, bookingRequired: true }, outdoor])).toEqual([]);
  });

  it('derives nothing without a step', () => {
    expect(derivedConditionsOf([])).toEqual([]);
  });
});

describe('mainTransportOf', () => {
  it('takes the mode that covers the most distance', () => {
    expect(
      mainTransportOf([
        { mode: 'walk', distanceM: 800 },
        { mode: 'metro', distanceM: 2500 },
        { mode: 'walk', distanceM: 900 },
        null,
      ]),
    ).toBe('metro');
  });

  it('walks without a trip, and on a tie', () => {
    expect(mainTransportOf([null])).toBe('walk');
    expect(
      mainTransportOf([
        { mode: 'bike', distanceM: 1000 },
        { mode: 'walk', distanceM: 1000 },
      ]),
    ).toBe('walk');
  });
});
