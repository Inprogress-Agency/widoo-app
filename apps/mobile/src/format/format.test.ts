import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import { formatBudget } from './budget';
import { formatDayAndTime } from './date';
import { formatDistance } from './distance';

const t = i18next.t;
const nbsp = '\u00a0';
const range = (min: number, max: number) => ({ budgetPerPersonEur: { min, max } });

describe('formatBudget', () => {
  it('writes the rounded sum per person, never a range', () => {
    expect(formatBudget(t, range(20, 30))).toEqual({
      amount: `≈${nbsp}25${nbsp}€`,
      perPerson: 'par pers.',
      spoken: 'environ 25 euros par personne',
    });
  });

  it('keeps 5 € for a small sum, and says free at zero', () => {
    expect(formatBudget(t, range(1, 2)).amount).toBe(`≈${nbsp}5${nbsp}€`);
    expect(formatBudget(t, range(0, 0))).toEqual({
      amount: 'Gratuit',
      perPerson: null,
      spoken: 'Gratuit',
    });
  });
});

describe('formatDistance', () => {
  it('writes meters by 50 under a kilometer, then kilometers with one decimal', () => {
    expect(formatDistance(t, 12, 'short')).toBe(`50${nbsp}m`);
    expect(formatDistance(t, 836, 'short')).toBe(`850${nbsp}m`);
    expect(formatDistance(t, 990, 'short')).toBe(`1${nbsp}km`);
    expect(formatDistance(t, 4230, 'short')).toBe(`4,2${nbsp}km`);
    expect(formatDistance(t, 12_400, 'short')).toBe(`12${nbsp}km`);
  });

  it('says the distance in words for the screen reader', () => {
    expect(formatDistance(t, 836, 'spoken')).toBe('850 mètres');
    expect(formatDistance(t, 1000, 'spoken')).toBe('1 kilomètre');
    expect(formatDistance(t, 4230, 'spoken')).toBe('4,2 kilomètres');
  });
});

describe('formatDayAndTime', () => {
  it('writes the day with a short month and the time on 24 hours', () => {
    expect(formatDayAndTime(new Date(2026, 8, 22, 14, 2).getTime())).toEqual({
      day: '22 sept.',
      time: '14:02',
    });
  });
});
