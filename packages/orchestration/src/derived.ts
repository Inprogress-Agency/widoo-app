/**
 * What the orchestration derives from the steps for the filters (Orchestration › Agrégats,
 * Filtres-et-Recherche): conditions and the transport of the route.
 */
import type { Condition, Transport } from '@widoo/shared';

/** Conditions derived from the steps; the others are ticked by the creator. */
export const derivedConditionKeys = [
  'no_booking',
  'indoor',
  'outdoor',
] as const satisfies readonly Condition[];
export type DerivedCondition = (typeof derivedConditionKeys)[number];

/** A step as the derived filters see it. */
export interface DerivedStep {
  bookingRequired: boolean;
  /** The place of the step is indoors (`places.is_indoor`). */
  isIndoor: boolean;
}

/**
 * `no_booking` when no step asks for a booking; `indoor` when most steps are indoors, `outdoor`
 * when most are outdoors, neither half and half (Filtres-et-Recherche). The creator can adjust.
 */
export function derivedConditionsOf(steps: readonly DerivedStep[]): DerivedCondition[] {
  if (steps.length === 0) return [];
  const conditions: DerivedCondition[] = [];
  if (steps.every((step) => !step.bookingRequired)) conditions.push('no_booking');
  const indoorCount = steps.filter((step) => step.isIndoor).length;
  if (indoorCount * 2 > steps.length) conditions.push('indoor');
  if (indoorCount * 2 < steps.length) conditions.push('outdoor');
  return conditions;
}

/** Transport of a route: the mode of its trips that covers the most distance, `walk` without (D-048). */
export function mainTransportOf(
  transitions: readonly ({ mode: Transport; distanceM: number } | null)[],
): Transport {
  const byMode = new Map<Transport, number>();
  for (const trip of transitions) {
    if (trip) byMode.set(trip.mode, (byMode.get(trip.mode) ?? 0) + trip.distanceM);
  }
  let main: Transport = 'walk';
  for (const [mode, distanceM] of byMode) {
    if (distanceM > (byMode.get(main) ?? 0)) main = mode;
  }
  return main;
}
