import type { PlannedRoute, PlannedRouteStep } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { formatDistance } from '../format/distance';
import { formatDuration } from '../format/duration';
import { taxonomyLabels } from '../i18n/labels';
import { parisTime, type Spoken } from '../route/sheetText';
import type { GoProgress, GoStep } from './progress';

/**
 * Texts of the route under way (Ecrans › E-07), pure functions of the progress, so that the
 * screen, the mini-player and their tests write a Go the same way.
 */

/** The name of a step: its title, or the name of its place. */
export const stepName = (step: PlannedRouteStep) => step.title ?? step.place.name;

const categoryOf = (step: PlannedRouteStep) =>
  taxonomyLabels().placeCategories[step.place.category];

/** « En route vers l'étape 1 », « Étape 2 sur 4, vous y êtes ». */
export function statusText(t: TFunction, progress: GoProgress): Spoken {
  const { current, phase, total, doneCount } = progress;
  if (!current) {
    // A skipped step is not done: with one, the steps done are told out of the total.
    const text =
      doneCount === total
        ? t('go.status.allDone')
        : t('go.status.doneOf', { count: doneCount, total });
    return { short: text, spoken: `${text}.` };
  }
  const values = { position: current.index + 1, total };
  return phase === 'on_site'
    ? { short: t('go.status.onSite', values), spoken: t('go.status.onSiteSpoken', values) }
    : { short: t('go.status.enRoute', values), spoken: t('go.status.enRouteSpoken', values) };
}

/**
 * « Balade, 20 min, à 900 m de vous » en route, without the distance when the position is
 * unknown; « Musée, 2 h 30 prévues, jusqu'à 13:10 environ » on site. Null once none is left.
 */
export function lineText(
  t: TFunction,
  progress: GoProgress,
  distanceM: number | null,
): Spoken | null {
  const { current } = progress;
  if (!current) {
    return null;
  }
  const { step } = current;
  const category = categoryOf(step);
  const form = (kind: 'short' | 'spoken') => {
    const duration = formatDuration(t, step.durationMin, kind);
    if (progress.phase === 'on_site' && current.times) {
      const time = parisTime(t, current.times.leavesAt);
      return t('go.line.onSite', {
        category,
        duration,
        time: kind === 'short' ? time.short : time.spoken,
      });
    }
    return distanceM === null
      ? t('go.line.enRoute', { category, duration })
      : t('go.line.enRouteDistance', {
          category,
          duration,
          distance: formatDistance(t, distanceM, kind),
        });
  };
  return { short: form('short'), spoken: form('spoken') };
}

/**
 * The header read in one piece (E-07, lecteur d'écran): « En route vers l'étape 1 sur 4. Place
 * des Abbesses. Balade, 20 minutes, à 900 mètres de vous. »
 */
export function headerSpoken(t: TFunction, progress: GoProgress, distanceM: number | null) {
  const line = lineText(t, progress, distanceM);
  return [
    statusText(t, progress).spoken,
    ...(progress.current ? [`${stepName(progress.current.step)}.`] : []),
    ...(line ? [`${line.spoken}.`] : []),
  ].join(' ');
}

/** « Départ 10:00 » and « Fin vers 17:00 », and the bar as a screen reader reads it. */
export function progressText(t: TFunction, planned: PlannedRoute, progress: GoProgress) {
  const start = parisTime(t, planned.timeline.startsAt);
  const end = parisTime(t, planned.timeline.endsAt);
  return {
    start: t('go.progress.start', { time: start.short }),
    end: t('go.progress.end', { time: end.short }),
    spoken: t('go.progress.spoken', {
      count: progress.doneCount,
      total: progress.total,
      start: start.spoken,
      end: end.spoken,
    }),
  };
}

/** The label of the mini-player: the whole name, which its single line may cut (D-034). */
export function miniPlayerLabel(t: TFunction, progress: GoProgress): string {
  const { current, phase, total, doneCount } = progress;
  if (!current) {
    return doneCount === total
      ? t('go.mini.allDone')
      : t('go.mini.doneOf', { count: doneCount, total });
  }
  const values = { position: current.index + 1, total, place: stepName(current.step) };
  return phase === 'on_site' ? t('go.mini.onSite', values) : t('go.mini.enRoute', values);
}

/**
 * The state of a step in the sheet « Le parcours »: « Fait à 10:22 », « Vous y êtes » or
 * « Prochaine étape » in blue, « Passée »; its category for a step to come.
 */
export function timelineState(
  t: TFunction,
  entry: GoStep,
  phase: GoProgress['phase'],
): { text: string; tone: 'done' | 'current' | 'muted' } {
  switch (entry.status) {
    case 'done':
      return {
        text: t('go.sheet.doneAt', { time: entry.doneAt ? parisTime(t, entry.doneAt).short : '' }),
        tone: 'done',
      };
    case 'skipped':
      return { text: t('go.sheet.skipped'), tone: 'muted' };
    case 'current':
      return {
        text: phase === 'on_site' ? t('go.sheet.here') : t('go.sheet.nextStep'),
        tone: 'current',
      };
    case 'upcoming':
      return { text: categoryOf(entry.step), tone: 'muted' };
  }
}
