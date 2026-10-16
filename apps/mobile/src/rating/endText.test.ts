import { describe, expect, it } from 'vitest';
import { plannedFixture } from '../go/testPlanned';
import { i18next } from '../i18n';
import { endTiles, ratingLabel, ratingOffer } from './endText';

const t = i18next.t.bind(i18next);
const at = '2026-10-24T09:00:00.000Z';
/** The fixture ended at 16:50 in Paris, 6 h 50 after its start at 10:00. */
const ended = (progress: Parameters<typeof plannedFixture>[0]) => ({
  ...plannedFixture(progress),
  status: 'completed' as const,
  completedAt: '2026-10-24T14:50:00.000Z',
  closedBy: 'user' as const,
});

describe('E-15 texts, in French', () => {
  it('sums up the outing in three tiles', () => {
    const outing = ended({ 0: { doneAt: at }, 1: { doneAt: at }, 2: { doneAt: at } });
    expect(
      endTiles(t, outing, new Date()).map(({ short, label, spoken }) => [short, label, spoken]),
    ).toEqual([
      ['3 sur 3', 'étapes faites', '3 étapes faites sur 3'],
      ['6 h 50', 'de sortie', '6 heures 50 de sortie'],
      ['16:50', 'fin', 'fin à 16 heures 50'],
    ]);
  });

  it('opens the stars from half of the steps done, skipped ones aside', () => {
    expect(
      ratingOffer(ended({ 0: { doneAt: at }, 1: { doneAt: at }, 2: { skippedAt: at } })),
    ).toEqual({
      kind: 'stars',
    });
    const partial = ratingOffer(ended({ 0: { doneAt: at }, 1: { skippedAt: at } }));
    expect(partial).toEqual({ kind: 'partial', minDone: 2 });
    expect(t('go.end.partial.title', { count: 2 })).toBe('Note à partir de 2 étapes faites');
  });

  it('names each rating', () => {
    expect([1, 2, 3, 4, 5].map((value) => ratingLabel(t, value))).toEqual([
      'Décevant',
      'Moyen',
      'Bien',
      'Très bien',
      'Parfait',
    ]);
    expect(t('go.end.rating.star', { value: 4, label: ratingLabel(t, 4) })).toBe(
      '4 sur 5, Très bien',
    );
  });
});
