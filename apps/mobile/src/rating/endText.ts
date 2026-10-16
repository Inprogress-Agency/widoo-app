import { canRateOuting, minDoneStepsToRate, type PlannedRoute } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { formatDuration } from '../format/duration';
import { parisTime, type Spoken } from '../route/sheetText';

/**
 * Texts of the end of an outing (Ecrans › E-15), pure functions of the outing, so that the
 * screen and its tests write it the same way.
 */

const ratingLabelKeys = ['disappointing', 'average', 'good', 'veryGood', 'perfect'] as const;

/** « Décevant » to « Parfait », the label of a rating from 1 to 5. */
export const ratingLabel = (t: TFunction, value: number) =>
  t(`go.end.rating.${ratingLabelKeys[Math.min(5, Math.max(1, value)) - 1] ?? 'good'}`);

/** One tile of the summary: its figure, its word under it, and what a screen reader says. */
export interface EndTile extends Spoken {
  key: 'done' | 'duration' | 'end';
  label: string;
}

const doneCountOf = (outing: PlannedRoute) =>
  outing.steps.filter((step) => step.doneAt !== null).length;

/**
 * « 4 sur 4 étapes faites », « 6 h 50 de sortie », « 16:50 fin »: the outing from its planned
 * start to its end, as `go_completed` counts it.
 */
export function endTiles(t: TFunction, outing: PlannedRoute, now: Date): EndTile[] {
  const done = doneCountOf(outing);
  const total = outing.steps.length;
  const endedAt = outing.completedAt ?? now.toISOString();
  const minutes = Math.max(
    0,
    (new Date(endedAt).getTime() - new Date(outing.startsAt).getTime()) / 60_000,
  );
  const end = parisTime(t, endedAt);
  return [
    {
      key: 'done',
      short: t('go.end.tiles.done', { done, total }),
      label: t('go.end.tiles.doneLabel'),
      spoken: t('go.end.tiles.doneSpoken', { count: done, total }),
    },
    {
      key: 'duration',
      short: formatDuration(t, minutes, 'short'),
      label: t('go.end.tiles.durationLabel'),
      spoken: t('go.end.tiles.durationSpoken', { duration: formatDuration(t, minutes, 'spoken') }),
    },
    {
      key: 'end',
      short: end.short,
      label: t('go.end.tiles.endLabel'),
      spoken: t('go.end.tiles.endSpoken', { time: end.spoken }),
    },
  ];
}

/**
 * What E-15 offers to rate: the stars once half of the steps are done, skipped ones aside
 * (D-033); under it, the steps it takes (« Note à partir de 2 étapes faites »).
 */
export function ratingOffer(outing: PlannedRoute) {
  return canRateOuting(outing)
    ? ({ kind: 'stars' } as const)
    : ({ kind: 'partial', minDone: minDoneStepsToRate(outing.steps.length) } as const);
}
