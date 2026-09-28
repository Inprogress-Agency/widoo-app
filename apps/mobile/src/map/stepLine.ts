import { labels, type RouteCard } from '@widoo/shared';
import type { TFunction } from 'i18next';
import { formatDuration } from '../format/duration';

type CardStep = RouteCard['steps'][number];

export interface StepLine {
  /** Place name; its category when the card names no step. */
  name: string;
  /** « Étape 1/4 · Balade · 20 min ». */
  detail: string;
  /** What the screen reader says of the step: « Merci, Boutique, 30 minutes ». */
  spoken: string;
  /** Its step dot on the map, for the screen reader: « Étape 3 sur 4, Merci, Boutique ». */
  dotLabel: string;
}

/**
 * Step line of the map tooltip (Ecrans › E-04): the place name, then « Étape i/n · category ·
 * time on the spot ». A card that names no step shows its category in place of the name, and
 * does not repeat it.
 */
export function stepLine(t: TFunction, step: CardStep, position: number, total: number): StepLine {
  const category = labels.fr.placeCategories[step.category];
  const name = step.name ?? category;
  const shown = step.name === null ? [] : [category];
  const detail = [
    t('map.tooltip.step', { position, total }),
    ...shown,
    ...(step.durationMin === null ? [] : [formatDuration(t, step.durationMin, 'short')]),
  ].join(t('map.tooltip.separator'));
  const place = [name, ...shown].join(', ');
  const spoken = [
    place,
    ...(step.durationMin === null ? [] : [formatDuration(t, step.durationMin, 'spoken')]),
  ].join(', ');
  const dotLabel = t('map.stepDot', { position, total, place });
  return { name, detail, spoken, dotLabel };
}
