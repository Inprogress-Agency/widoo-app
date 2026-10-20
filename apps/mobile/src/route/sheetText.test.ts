import { RouteDetail, type PlaceHours, type RouteDetailStep } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import fixtures from './generated/route-sheets.json';
import {
  agoText,
  hoursLine,
  localTime,
  reportedLine,
  tilesText,
  todaySlots,
  transitionText,
  verificationText,
} from './sheetText';

const t = i18next.t;
const nbsp = ' ';
// Fictitious step built from the first demo sheet.
const sheet = RouteDetail.parse(fixtures.routes[0]);
const base = sheet.steps[0] as RouteDetailStep;
// Monday 12 October 2026, 9:00 in Paris.
const monday = new Date('2026-10-12T07:00:00.000Z');
const step = (patch: Partial<RouteDetailStep>): RouteDetailStep => ({ ...base, ...patch });
const hours: PlaceHours[] = [
  { weekday: 0, opens: '10:00', closes: '19:00', validFrom: null, validTo: null },
  { weekday: 1, opens: '09:00', closes: '12:00', validFrom: null, validTo: null },
  { weekday: 1, opens: '14:00', closes: '18:00', validFrom: null, validTo: null },
];
const at = (iso: string) => ({ ...base.verification, lastConfirmedAt: iso });

describe('budget tile (D-032)', () => {
  const budget = (euros: number) =>
    tilesText(t, { ...sheet, budgetPerPersonEur: euros }).find((tile) => tile.key === 'budget');

  it.each([
    [23, `≈${nbsp}25${nbsp}€`, 'environ 25 euros par personne'],
    [22, `≈${nbsp}20${nbsp}€`, 'environ 20 euros par personne'],
    [2, `≈${nbsp}5${nbsp}€`, 'environ 5 euros par personne'],
  ])(
    'writes %d € as %s per person, read %s, never « env. » nor a range',
    (euros, value, spoken) => {
      expect(budget(euros)).toMatchObject({ value, label: 'Par pers.', spoken });
      expect(budget(euros)?.value).not.toMatch(/env|–|-/);
    },
  );

  it('says « Gratuit » when the sum is zero', () => {
    expect(budget(0)).toMatchObject({ value: 'Gratuit', spoken: 'Gratuit' });
  });

  it('writes the other tiles with what a screen reader says', () => {
    const tiles = tilesText(t, {
      durationMin: 420,
      budgetPerPersonEur: 40,
      distanceM: 6100,
      stepCount: 4,
    });
    expect(tiles.map((tile) => tile.spoken)).toEqual([
      '7 heures, durée',
      'environ 40 euros par personne',
      '6,1 kilomètres, distance',
      '4, étapes',
    ]);
  });
});

describe('times and hours of the steps', () => {
  it('writes a time of Paris by default, said in words', () => {
    expect(localTime(t, '2026-09-25T08:35:00.000Z')).toEqual({
      short: '10:35',
      spoken: '10 heures 35',
    });
    expect(localTime(t, '2026-09-25T08:00:00.000Z').spoken).toBe('10 heures');
  });

  it('keeps the slots of the day, split hours included, and the valid seasons only', () => {
    expect(todaySlots(hours, new Date('2026-10-13T07:00:00.000Z'))).toHaveLength(2);
    const summer = hours
      .slice(0, 1)
      .map((slot) => ({ ...slot, validFrom: '2026-06-01', validTo: '2026-09-30' }));
    expect(todaySlots(summer, monday)).toEqual([]);
  });

  it('reads the times and the day in the zone of the city, not in the one of the phone', () => {
    expect(localTime(t, '2026-09-25T08:35:00.000Z', 'America/New_York').short).toBe('04:35');
    // Monday 12 October at 23:30 in Paris: still Monday there, already Tuesday in Tokyo.
    const late = new Date('2026-10-12T21:30:00.000Z');
    expect(todaySlots(hours, late, 'Europe/Paris').map((slot) => slot.weekday)).toEqual([0]);
    expect(todaySlots(hours, late, 'Asia/Tokyo').map((slot) => slot.weekday)).toEqual([1, 1]);
    const open = hoursLine(t, step({ place: { ...base.place, hours } }), late, 'Asia/Tokyo');
    expect(open).toMatchObject({
      kind: 'open',
      hours: "aujourd'hui, 09:00 – 12:00, 14:00 – 18:00",
    });
  });

  it('says open today, closed today, or the usual hours of a reported place (D-013)', () => {
    expect(hoursLine(t, step({ place: { ...base.place, hours } }), monday)).toEqual({
      kind: 'open',
      hours: "aujourd'hui, 10:00 – 19:00",
      spoken: "Ouvert aujourd'hui, de 10:00 à 19:00",
    });
    const sunday = new Date('2026-10-11T07:00:00.000Z');
    expect(hoursLine(t, step({ place: { ...base.place, hours } }), sunday)).toEqual({
      kind: 'closed',
      text: "Fermé aujourd'hui",
    });
    const reports = { count: 3, lastAt: '2026-09-22T10:00:00.000Z' };
    const reported = step({
      place: { ...base.place, hours },
      verification: { ...base.verification, reports },
    });
    expect(hoursLine(t, reported, monday)).toEqual({
      kind: 'usual',
      text: 'Horaires habituels 10:00 – 19:00',
    });
    expect(hoursLine(t, step({ place: { ...base.place, hours: [] } }), monday)).toBeNull();
  });

  it('writes a trip with its mode and its distance', () => {
    const trip = { distanceM: 1100, durationMin: 15, mode: 'walk' as const, estimated: true };
    expect(transitionText(t, trip)).toEqual({
      short: `15${nbsp}min à pied (1,1${nbsp}km)`,
      spoken: '15 minutes à pied, 1,1 kilomètre',
    });
  });
});

describe('verification of the places (D-013, D-056)', () => {
  it('counts the visitors who verified a place, or says it never was', () => {
    const verified = step({
      verification: { ...at('2026-09-20T10:00:00.000Z'), confirmations: 12 },
    });
    expect(verificationText(t, verified, monday)).toEqual({
      kind: 'verified',
      text: 'Vérifié par 12 visiteurs le 20 sept.',
    });
    const never = step({
      verification: { confirmations: 0, lastConfirmedAt: null, reports: null },
    });
    expect(verificationText(t, never, monday)).toEqual({
      kind: 'never',
      text: 'Pas encore vérifié',
    });
  });

  it('dates the last verification of a stale place', () => {
    const stale = step({
      place: { ...base.place, verificationStatus: 'stale' },
      verification: at('2026-06-01T10:00:00.000Z'),
    });
    expect(verificationText(t, stale, monday)).toEqual({
      kind: 'stale',
      text: 'Dernière vérification il y a 4 mois',
    });
    expect(agoText(t, '2026-10-02T10:00:00.000Z', monday)).toBe('il y a 9 jours');
  });

  it('tells a reported place, and the line under the tiles leads to the first one', () => {
    const reports = { count: 3, lastAt: '2026-09-22T10:00:00.000Z' };
    const reported = step({ verification: { ...at('2026-09-18T10:00:00.000Z'), reports } });
    expect(verificationText(t, reported, monday)).toEqual({
      kind: 'reported',
      banner: "Signalé fermé par 3 visiteurs le 22 sept. Vérifiez avant d'y aller.",
      lastVisit: 'Dernière visite sans problème le 18 sept.',
    });
    const place = { ...base.place, name: 'Café fictif' };
    const one = reportedLine(t, [base, { ...reported, place }]);
    expect(one).toEqual({
      text: 'Café fictif signalé, peut-être fermé',
      firstIndex: 1,
      place: 'Café fictif',
    });
    expect(reportedLine(t, [reported, reported])?.text).toBe('2 lieux signalés');
    expect(reportedLine(t, [base])).toBeNull();
  });
});
