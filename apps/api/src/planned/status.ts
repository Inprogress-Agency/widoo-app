/**
 * Moves of a planning between statuses (Ecrans E-06, E-07, E-08; D-029, D-033, D-038): the user
 * starts, completes, stops, cancels or brings back a planning; `missed` is set by the job alone.
 */
import type {
  PlannedRouteCloser,
  PlannedRouteStatus,
  SettablePlannedRouteStatus,
} from '@widoo/shared';

/** For each status the user sets, the statuses it can come from; the same one is a no-op. */
const allowedFrom: Record<SettablePlannedRouteStatus, readonly PlannedRouteStatus[]> = {
  // « Rétablir » a cancelled one, « Reprogrammer » a missed one (with a new start).
  planned: ['planned', 'cancelled', 'missed'],
  // « C'est parti », and « Relancer » a stopped one.
  in_progress: ['in_progress', 'planned', 'stopped'],
  // « Terminer la sortie ».
  completed: ['completed', 'in_progress'],
  // « Arrêter le parcours », without a note.
  stopped: ['stopped', 'in_progress'],
  // « Annuler la sortie ».
  cancelled: ['cancelled', 'planned'],
};

export const canMove = (from: PlannedRouteStatus, to: SettablePlannedRouteStatus) =>
  allowedFrom[to].includes(from);

/** Statuses whose start can still change: before the Go, or when it starts now. */
export const isDatable = (status: PlannedRouteStatus) =>
  status === 'planned' || status === 'in_progress';

/** Closing of a planning that reaches `to` at `now`: closed by the user when it ends. */
export function closingOf(
  to: SettablePlannedRouteStatus,
  now: Date,
): { completedAt: Date | null; closedBy: PlannedRouteCloser | null } {
  switch (to) {
    case 'completed':
      return { completedAt: now, closedBy: 'user' };
    case 'stopped':
      return { completedAt: null, closedBy: 'user' };
    default:
      return { completedAt: null, closedBy: null };
  }
}
