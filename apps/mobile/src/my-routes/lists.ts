import {
  canRateOuting,
  type OwnRouteSummary,
  type PlannedRoute,
  type RouteStatus,
} from '@widoo/shared';

/**
 * The rules of the lists of E-08 (Ecrans › E-08, D-033, D-038): which outings are past, what each
 * line offers, and the pill of a creation. Pure, so that the screen and its tests agree.
 */

/** The segments of E-08, in their order. */
export const segments = ['upcoming', 'favorites', 'past', 'created'] as const;
export type Segment = (typeof segments)[number];

/** An outing done, stopped, or whose day passed without a start (« Pas fait », D-038). */
const pastStatuses: readonly PlannedRoute['status'][] = ['completed', 'stopped', 'missed'];

/** The past outings, the latest first: the API lists every planning by start. */
export function pastOutings(items: readonly PlannedRoute[]): PlannedRoute[] {
  return items
    .filter((item) => pastStatuses.includes(item.status))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

/** The action of a past line, on its right: none once rated, or for a too short outing. */
export type PastAction = 'rate' | 'relaunch' | 'reschedule';

export function pastActionOf(outing: PlannedRoute): PastAction | null {
  if (outing.status === 'stopped') {
    return 'relaunch';
  }
  if (outing.status === 'missed') {
    return 'reschedule';
  }
  return outing.myRating === null && canRateOuting(outing) ? 'rate' : null;
}

/** The pill of a past line: « Arrêté » (D-033) or « Pas fait » (D-038). */
export function pastPillOf(outing: PlannedRoute): 'stopped' | 'missed' | null {
  return outing.status === 'stopped' || outing.status === 'missed' ? outing.status : null;
}

/** The bookings of « À préparer » still to tick. */
export const toPrepareCount = (outing: PlannedRoute) =>
  outing.checklist.filter((item) => !item.isChecked).length;

/** The pill of a creation; `toFix` gathers both statuses the moderation asks to correct. */
export type CreatedPill =
  'draft' | 'pending' | 'published' | 'toFix' | 'private' | 'rejected' | 'unpublished';

const pillOfStatus: Record<RouteStatus, CreatedPill> = {
  draft: 'draft',
  private: 'private',
  pending: 'pending',
  changes_requested: 'toFix',
  published: 'published',
  needs_fix: 'toFix',
  rejected: 'rejected',
  unpublished: 'unpublished',
};

export const createdPillOf = (route: OwnRouteSummary): CreatedPill => pillOfStatus[route.status];

/** A published or private route opens its sheet; the others belong to the editor. */
export const opensSheet = (route: OwnRouteSummary) =>
  route.status === 'published' || route.status === 'private';
