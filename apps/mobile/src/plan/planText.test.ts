import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import {
  dayChipText,
  dayName,
  plannedDateText,
  plannedSubtitle,
  shortDayName,
  submitLabel,
} from './planText';

const t = i18next.t;
// Friday 25 September 2026, as the boards of E-06.
const today = '2026-09-25';

describe('day chips', () => {
  it('names today, tomorrow and the day after, as the boards', () => {
    expect(dayChipText(t, today, today).label).toBe("Aujourd'hui");
    expect(dayChipText(t, '2026-09-26', today)).toEqual({
      label: 'Demain',
      spoken: 'Demain, samedi 26 septembre',
    });
    expect(dayChipText(t, '2026-09-27', today)).toEqual({
      label: 'Dim. 27',
      spoken: 'dimanche 27 septembre',
    });
  });

  it('gives its month to a day of the calendar, and its year when it is not this one', () => {
    expect(shortDayName('2026-10-10', today)).toBe('Sam. 10 oct.');
    expect(dayName('2026-10-10', today)).toBe('samedi 10 octobre');
    expect(dayName('2027-01-23', today)).toBe('samedi 23 janvier 2027');
  });
});

describe('submitLabel', () => {
  it('says the day and the time, and the move of a planning', () => {
    expect(submitLabel(t, false, '2026-09-26', 600, today)).toBe('Programmer samedi 26 à 10:00');
    expect(submitLabel(t, false, '2026-10-10', 600, today)).toBe(
      'Programmer samedi 10 octobre à 10:00',
    );
    expect(submitLabel(t, true, '2026-09-27', 660, today)).toBe('Déplacer au dimanche 27 à 11:00');
  });
});

describe('after planning', () => {
  it('writes the toast and the date of the sticky bar', () => {
    expect(plannedSubtitle(t, '2026-09-26', 600, today)).toBe('Samedi 26 septembre à 10:00');
    expect(
      plannedDateText(t, '2026-09-26T10:00:00+02:00', new Date('2026-09-25T10:00:00Z')),
    ).toEqual({
      label: 'Sam. 26, 10:00',
      spoken: 'Sortie programmée le samedi 26 septembre à 10:00, modifier la sortie',
    });
  });
});
