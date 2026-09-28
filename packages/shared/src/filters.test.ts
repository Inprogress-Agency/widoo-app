import { describe, expect, it } from 'vitest';
import { matchesFilters } from './filters';

// A fictitious route: couple, culture and food, indoor without booking, on foot.
const card: Parameters<typeof matchesFilters>[0] = {
  audiences: ['couple', 'friends'],
  moods: ['culture', 'food'],
  conditions: ['indoor', 'no_booking'],
  durationBucket: 'half_day',
  budgetBucket: 'low',
  transport: 'walk',
};

describe('matchesFilters', () => {
  it('lets every card through without filters, or with empty groups', () => {
    expect(matchesFilters(card, {})).toBe(true);
    expect(matchesFilters(card, { moods: [], conditions: [] })).toBe(true);
  });

  it('wants one of the values of a public, an ambiance, a bucket or a transport', () => {
    expect(matchesFilters(card, { moods: ['nature', 'food'] })).toBe(true);
    expect(matchesFilters(card, { moods: ['nature'] })).toBe(false);
    expect(matchesFilters(card, { audiences: ['solo', 'couple'] })).toBe(true);
    expect(matchesFilters(card, { durations: ['1_2h', 'half_day'] })).toBe(true);
    expect(matchesFilters(card, { budgets: ['free'] })).toBe(false);
    expect(matchesFilters(card, { transports: ['bike', 'walk'] })).toBe(true);
    expect(matchesFilters(card, { transports: ['car'] })).toBe(false);
  });

  it('wants every condition, which are requirements', () => {
    expect(matchesFilters(card, { conditions: ['indoor', 'no_booking'] })).toBe(true);
    expect(matchesFilters(card, { conditions: ['indoor', 'wheelchair'] })).toBe(false);
  });

  it('wants every group at once', () => {
    expect(matchesFilters(card, { moods: ['culture'], budgets: ['low'] })).toBe(true);
    expect(matchesFilters(card, { moods: ['culture'], budgets: ['high'] })).toBe(false);
  });
});
