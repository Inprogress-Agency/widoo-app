/**
 * Who reads the sheet of a route (wiki API › Fiche parcours › Qui obtient quoi, D-093): by its
 * status, the token of its private link and its author. Every refusal is the same 404, so that
 * the answer never tells a private route from one that does not exist; a withdrawn route is 410
 * for anyone. The right to the whole of a Premium route is `canAccessRoute`, apart.
 */
import { timingSafeEqual } from 'node:crypto';
import { onlineRouteStatuses, type RouteStatus } from '@widoo/shared';

/** What the decision reads of the route row. */
export interface SheetRoute {
  status: RouteStatus;
  authorId: string | null;
  shareToken: string | null;
  /** Set once, at the first publication: a route resubmitted after `needs_fix` has it. */
  publishedAt: Date | null;
}

/** What the decision reads of the request: the signed-in account, and `?token=`. */
export interface SheetCaller {
  userId: string | null;
  token: string | undefined;
}

export type SheetAccess =
  | { kind: 'open'; isAuthor: boolean; viaLink: boolean }
  | { kind: 'not_found' }
  | { kind: 'removed' };

/** Statuses a private link opens while the route was never published (Q4). */
const linkStatuses: readonly RouteStatus[] = ['private', 'pending', 'changes_requested'];

/** Constant time, so that the comparison tells nothing of the right token. */
function isTokenOf(route: SheetRoute, token: string | undefined): boolean {
  if (!token || !route.shareToken) return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(route.shareToken);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const isOnline = (status: RouteStatus) =>
  (onlineRouteStatuses as readonly RouteStatus[]).includes(status);

export function sheetAccessOf(route: SheetRoute, caller: SheetCaller): SheetAccess {
  if (route.status === 'unpublished') return { kind: 'removed' };
  if (route.status === 'draft' || route.status === 'rejected') return { kind: 'not_found' };
  const isAuthor = caller.userId !== null && caller.userId === route.authorId;
  if (isOnline(route.status) || isAuthor) return { kind: 'open', isAuthor, viaLink: false };
  // A route published once and back in review is out of the public until the decision (Q3).
  const opensByLink = linkStatuses.includes(route.status) && route.publishedAt === null;
  if (opensByLink && isTokenOf(route, caller.token)) {
    return { kind: 'open', isAuthor: false, viaLink: true };
  }
  return { kind: 'not_found' };
}
