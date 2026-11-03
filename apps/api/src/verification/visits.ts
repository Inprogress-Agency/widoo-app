import { sql, type SQLWrapper } from 'drizzle-orm';
import { plannedRoutes, plannedSteps } from '../db/schema';

/**
 * Whether the account did the step of the place (« Étape suivante ») in a Go it completed by
 * `at`, as an SQL condition on values or on the columns of an outer query: the visit a single
 * « Fermé définitivement » needs to flag the place (Creation-et-Moderation › État d'un lieu,
 * D-056, E-15). The step of the place is the one of the snapshot of the outing.
 */
export const didStepInCompletedGo = (
  userId: SQLWrapper | string,
  placeId: SQLWrapper | string,
  at: SQLWrapper,
) => sql`exists (
  select 1 from ${plannedRoutes}
  join ${plannedSteps} on ${plannedSteps.plannedRouteId} = ${plannedRoutes.id}
  where ${plannedRoutes.userId} = ${userId}
    and ${plannedRoutes.status} = 'completed'
    and ${plannedRoutes.completedAt} <= ${at}
    and ${plannedSteps.doneAt} is not null
    and ${plannedRoutes.routeRevisionSnapshot} @> jsonb_build_object('steps', jsonb_build_array(
      jsonb_build_object('id', ${plannedSteps.stepId}::text,
        'place', jsonb_build_object('id', ${placeId}::text)))))`;
