import type { OwnRouteSummary } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { plannedFixture } from '../go/testPlanned';
import { i18next } from '../i18n';
import {
  createdDetail,
  createdTitle,
  laterLine,
  myRatingText,
  nextBadge,
  outingWindow,
  pastDate,
} from './text';

const t = i18next.t;
// Friday 23 October 2026; the fixture starts on Saturday 24 at 10:00 in Paris, ends at 14:00.
const now = new Date('2026-10-23T10:00:00.000Z');
const outing = plannedFixture();

describe('the dates of the outings to come', () => {
  it('says « Demain, 10:00 » on the photo of the next one', () => {
    expect(nextBadge(t, outing, now)).toEqual({
      label: 'Demain, 10:00',
      spoken: 'Demain, samedi 24 octobre, 10:00',
    });
  });

  it('gives the day and the window of the outing, as the board', () => {
    expect(outingWindow(t, outing, now).label).toBe('Samedi 24 octobre, 10:00 à 14:00 environ');
    expect(laterLine(t, outing, now)).toBe('Samedi 24 octobre, 10:00');
  });
});

describe('the dates of the past outings', () => {
  it('says when it was done, or when it was planned', () => {
    const later = new Date('2026-11-02T10:00:00.000Z');
    const done = { ...outing, status: 'completed' as const, completedAt: '2026-10-24T12:00:00Z' };
    expect(pastDate(t, done, later)).toBe('Fait le samedi 24 octobre');
    expect(pastDate(t, { ...outing, status: 'missed' }, later)).toBe('Prévu le samedi 24 octobre');
    expect(pastDate(t, { ...outing, status: 'stopped' }, later)).toBe('Samedi 24 octobre');
  });

  it('reads my rating with its word', () => {
    expect(myRatingText(t, 5)).toEqual({
      value: '5',
      label: 'Votre note, Parfait',
      spoken: 'Votre note, 5 sur 5, Parfait',
    });
  });
});

describe('the lines of my creations', () => {
  const created = (overrides: Partial<OwnRouteSummary>): OwnRouteSummary => ({
    id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e40',
    status: 'draft',
    isOfficial: false,
    title: null,
    shareToken: null,
    publishedAt: null,
    updatedAt: '2026-10-21T08:00:00.000Z',
    revision: null,
    stepCount: 3,
    ...overrides,
  });

  it('names a route without title « Nouveau parcours »', () => {
    expect(createdTitle(t, created({}))).toBe('Nouveau parcours');
  });

  it('says when a draft moved, the link of a private route, the steps otherwise', () => {
    expect(createdDetail(t, created({}), now)).toBe('Modifié il y a 2 jours');
    expect(createdDetail(t, created({ updatedAt: '2026-10-22T08:00:00Z' }), now)).toBe(
      'Modifié hier',
    );
    expect(createdDetail(t, created({ status: 'private' }), now)).toBe(
      'Visible par lien seulement',
    );
    expect(createdDetail(t, created({ status: 'pending' }), now)).toBe('3 étapes');
  });
});
