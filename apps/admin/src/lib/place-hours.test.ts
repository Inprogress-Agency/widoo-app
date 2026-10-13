import { describe, expect, it } from 'vitest';
import { dayTextsToHours, hoursToDayTexts, parseDayHours } from './place-hours';

const slot = (weekday: number, opens: string, closes: string) => ({
  weekday,
  opens,
  closes,
  validFrom: null,
  validTo: null,
});

describe('parseDayHours', () => {
  it.each([
    ['9:00-18:00', [{ opens: '09:00', closes: '18:00' }]],
    [
      '09h00 – 12h30, 14:00-18:00',
      [
        { opens: '09:00', closes: '12:30' },
        { opens: '14:00', closes: '18:00' },
      ],
    ],
    ['19:00-01:00', [{ opens: '19:00', closes: '01:00' }]],
    ['', []],
    ['  ', []],
  ])('reads « %s »', (text, expected) => {
    expect(parseDayHours(text)).toEqual(expected);
  });

  it.each(['9-18', 'matin', '25:00-26:00', '9:00-18:00;19:00-20:00'])('refuses « %s »', (text) => {
    expect(parseDayHours(text)).toBeUndefined();
  });
});

describe('hours of the form', () => {
  const hours = [slot(0, '09:00', '12:30'), slot(0, '14:00', '18:00'), slot(5, '19:00', '01:00')];

  it('writes one line per day, Monday first', () => {
    expect(hoursToDayTexts(hours)).toEqual([
      '09:00-12:30, 14:00-18:00',
      '',
      '',
      '',
      '',
      '19:00-01:00',
      '',
    ]);
  });

  it('gives back the hours it was written from', () => {
    expect(dayTextsToHours(hoursToDayTexts(hours), hours)).toEqual(hours);
  });

  it('keeps the seasonal slots, which the form does not show', () => {
    const summer = { ...slot(6, '10:00', '20:00'), validFrom: '2026-07-01', validTo: '2026-08-31' };
    expect(hoursToDayTexts([summer])).toEqual(['', '', '', '', '', '', '']);
    expect(dayTextsToHours(['9:00-10:00', '', '', '', '', '', ''], [summer])).toEqual([
      slot(0, '09:00', '10:00'),
      summer,
    ]);
  });

  it('gives nothing when a line cannot be read', () => {
    expect(dayTextsToHours(['matin', '', '', '', '', '', ''], [])).toBeUndefined();
  });
});
