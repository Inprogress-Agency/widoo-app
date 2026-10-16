import type {
  AnalyticsEventArgs,
  CreatePlannedRoute,
  PlannedRoute,
  UpdatePlannedRoute,
} from '@widoo/shared';
import { doneRatio, emptyGoLocal, goProgress } from './progress';

export interface StartGoDeps {
  /** The Go in progress of the account, if any, fresh from the API. */
  current: () => Promise<PlannedRoute | null>;
  /** The planning to come of the route, if any. */
  plannedOf: (routeId: string) => Promise<PlannedRoute | null>;
  create: (body: CreatePlannedRoute) => Promise<PlannedRoute>;
  update: (id: string, update: UpdatePlannedRoute) => Promise<PlannedRoute>;
  /** The alert « Un parcours est déjà en cours »: true on « Arrêter et lancer ». */
  confirmReplace: (title: string) => Promise<boolean>;
  trackStarted: (properties: AnalyticsEventArgs<'go_started'>[0]) => void;
  trackStopped: (properties: AnalyticsEventArgs<'go_stopped'>[0]) => void;
  now: () => Date;
}

/**
 * « C'est parti » (Ecrans › E-07, ouverture): the Go of the route, started now. A planned route
 * starts its planning, moved to now so that the times are those of the outing; another one is
 * planned now first. One Go at a time (D-033): another one in progress is stopped after the alert.
 * The Go already under way for the route is only reopened. Null when the user keeps the other.
 */
export async function startGo(routeId: string, deps: StartGoDeps): Promise<PlannedRoute | null> {
  const current = await deps.current();
  if (current && current.route.id === routeId) {
    return current;
  }
  if (current) {
    if (!(await deps.confirmReplace(current.route.title))) {
      return null;
    }
    await deps.update(current.id, { status: 'stopped' });
    deps.trackStopped({
      route_id: current.route.id,
      steps_done_ratio: doneRatio(goProgress(current, emptyGoLocal)),
    });
  }
  const startsAt = deps.now().toISOString();
  const planned = await deps.plannedOf(routeId);
  const go = planned
    ? await deps.update(planned.id, { status: 'in_progress', startsAt })
    : await deps
        .create({ routeId, startsAt })
        .then((created) => deps.update(created.id, { status: 'in_progress' }));
  deps.trackStarted({ route_id: routeId, was_planned: planned !== null });
  return go;
}
