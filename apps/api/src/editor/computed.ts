/**
 * `routes.computed` as the orchestration stores it (Modele-de-Donnees › routes, D-088): the
 * result of `computeRoute` on our estimated trips, in snake case as the search reads it. The
 * buckets and the transport have their own columns.
 */
import type { ComputedRoute } from '@widoo/orchestration';
import type { RouteEvaluation } from '@widoo/shared';
import type { AccessColumn } from '../transit/access';

/** What the editor answers of a result: everything but the timeline of the day. */
export const evaluationFrom = ({
  computed,
  warnings,
  errors,
  proposedStart,
  proposedOrder,
}: ComputedRoute): RouteEvaluation => ({
  computed,
  warnings,
  errors,
  proposedStart,
  proposedOrder,
});

/** The stored `computed` of a result, with the access of its first step (D-050); null without steps. */
export function storedComputedOf(result: ComputedRoute, access: AccessColumn) {
  const { computed } = result;
  return (
    computed && {
      duration_min: computed.durationMin,
      budget_per_person_eur: computed.budgetPerPersonEur,
      distance_m: computed.distanceM,
      walking_m: computed.walkingM,
      effort: computed.effort,
      conditions: computed.conditions,
      start_time: computed.startTime,
      start_computed: computed.startComputed,
      warnings: result.warnings.map((issue) => issue.code),
      proposed_start: result.proposedStart,
      proposed_order: result.proposedOrder,
      access,
      computed_at: computed.computedAt,
    }
  );
}
export type StoredComputed = NonNullable<ReturnType<typeof storedComputedOf>>;
