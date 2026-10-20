/** The result of `computeRoute` as the editor answers it (wiki API › Création, D-049). */
import type { ComputedRoute } from '@widoo/orchestration';
import type { RouteEvaluation } from '@widoo/shared';

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
