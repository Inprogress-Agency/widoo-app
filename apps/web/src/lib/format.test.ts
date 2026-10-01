import { describe, expect, it } from 'vitest';
import {
  formatBudget,
  formatDaysAgo,
  formatDistance,
  formatDuration,
  formatRating,
  formatShortDate,
  roundBudget,
} from './format';

// Intl writes a narrow non-breaking space in some formats: compare with plain spaces.
const plain = (text: string | null) => text?.replace(/[\u00a0\u202f]/g, ' ');

describe('formatDuration', () => {
  it('writes whole hours, minutes, and both', () => {
    expect(plain(formatDuration(420, 'fr'))).toBe('7 h');
    expect(plain(formatDuration(45, 'en'))).toBe('45 min');
    expect(plain(formatDuration(210, 'fr'))).toBe('3 h 30');
    expect(plain(formatDuration(185, 'fr'))).toBe('3 h 05');
    expect(plain(formatDuration(210, 'en'))).toBe('3 h 30 min');
  });

  it('never breaks the line inside a duration (E-21)', () => {
    expect(formatDuration(210, 'fr')).not.toContain(' ');
  });
});

describe('roundBudget (D-032)', () => {
  it('rounds the exact sum to 5 €', () => {
    expect(roundBudget(23)).toBe(25);
    expect(roundBudget(22)).toBe(20);
    expect(roundBudget(40)).toBe(40);
  });

  it('shows 5 € for a small non zero sum, nothing for a free route', () => {
    expect(roundBudget(2)).toBe(5);
    expect(roundBudget(0)).toBeNull();
  });
});

describe('formatBudget', () => {
  it('writes the rounded amount with « ≈ » in each language', () => {
    expect(plain(formatBudget(38, 'fr'))).toBe('≈ 40 €');
    expect(plain(formatBudget(38, 'en'))).toBe('≈ €40');
  });

  it('returns nothing for a free route', () => {
    expect(formatBudget(0, 'fr')).toBeNull();
  });

  it('never breaks the line inside a price (E-21)', () => {
    expect(formatBudget(38, 'fr')).not.toContain(' ');
  });
});

describe('formatDistance', () => {
  it('writes meters under a kilometer, kilometers with one decimal above', () => {
    expect(plain(formatDistance(804, 'fr'))).toBe('800 m');
    expect(plain(formatDistance(6100, 'fr'))).toBe('6,1 km');
    expect(plain(formatDistance(6100, 'en'))).toBe('6.1 km');
  });
});

describe('formatRating', () => {
  it('writes one decimal in the notation of the language', () => {
    expect(formatRating(4.9, 'fr')).toBe('4,9');
    expect(formatRating(5, 'en')).toBe('5.0');
  });
});

describe('formatShortDate', () => {
  it('writes the day and the short month, in Paris time', () => {
    expect(formatShortDate('2026-09-20T10:00:00Z', 'fr')).toBe('20 sept.');
    expect(formatShortDate('2026-09-20T10:00:00Z', 'en')).toBe('Sep 20');
    expect(formatShortDate('2026-09-19T23:30:00Z', 'fr')).toBe('20 sept.');
  });
});

describe('formatDaysAgo', () => {
  const now = new Date('2026-09-28T12:00:00Z');

  it('counts whole days', () => {
    expect(formatDaysAgo('2026-09-25T09:00:00Z', now, 'fr')).toBe('il y a 3 jours');
    expect(formatDaysAgo('2026-09-25T09:00:00Z', now, 'en')).toBe('3 days ago');
  });

  it('says yesterday and today', () => {
    expect(formatDaysAgo('2026-09-27T09:00:00Z', now, 'fr')).toBe('hier');
    expect(formatDaysAgo('2026-09-28T08:00:00Z', now, 'en')).toBe('today');
  });
});
