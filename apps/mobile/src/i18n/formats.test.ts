import { afterEach, describe, expect, it } from 'vitest';
import { formatDayAndTime } from '../format/date';
import { formatRating } from '../format/rating';
import { capitalize, intlLocale } from './formats';
import { i18next } from '.';

afterEach(async () => {
  await i18next.changeLanguage('fr');
});

describe('formats of the language shown', () => {
  it('writes French dates and numbers by default', () => {
    expect(intlLocale()).toBe('fr-FR');
    expect(formatRating(4.86)).toBe('4,9');
    expect(capitalize('samedi')).toBe('Samedi');
  });

  it('switches to British English at once: day before month, 24-hour clock, decimal point', async () => {
    await i18next.changeLanguage('en');
    expect(intlLocale()).toBe('en-GB');
    expect(formatRating(4.86)).toBe('4.9');
    expect(formatDayAndTime(new Date(2026, 8, 22, 14, 2).getTime())).toEqual({
      day: '22 Sept',
      time: '14:02',
    });
  });
});
