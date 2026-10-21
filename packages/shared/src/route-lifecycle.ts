/**
 * Life cycle of a route (wiki Creation-et-Moderation › Cycle de vie d'un parcours): the one place
 * of the transitions, read by the API before any status is written.
 */
import type { RouteStatus } from './taxonomies';

/**
 * Who moves a route: its `author`; an `editor` of the Widoo team submitting its own route, which
 * is published without the queue (still under the blocking rules); a `moderator` deciding in the
 * admin; the `system` (nightly recomputation, a place closed by the team).
 */
export type RouteActor = 'author' | 'editor' | 'moderator' | 'system';

type Transition = { from: RouteStatus; to: RouteStatus; by: readonly RouteActor[] };

/** The edges of the diagram of the wiki, and the direct publication of an editor (D-050). */
export const routeTransitions: readonly Transition[] = [
  { from: 'draft', to: 'private', by: ['author'] },
  { from: 'draft', to: 'pending', by: ['author'] },
  { from: 'private', to: 'pending', by: ['author'] },
  { from: 'pending', to: 'published', by: ['moderator'] },
  { from: 'pending', to: 'changes_requested', by: ['moderator'] },
  { from: 'pending', to: 'rejected', by: ['moderator'] },
  { from: 'changes_requested', to: 'pending', by: ['author'] },
  { from: 'published', to: 'needs_fix', by: ['system', 'moderator'] },
  { from: 'needs_fix', to: 'pending', by: ['author'] },
  { from: 'published', to: 'unpublished', by: ['author', 'moderator'] },
  // The team takes down a route to fix (A-02, A-04) and puts an unpublished one back (A-04).
  { from: 'needs_fix', to: 'unpublished', by: ['moderator'] },
  { from: 'unpublished', to: 'published', by: ['moderator'] },
  { from: 'rejected', to: 'draft', by: ['author'] },
  { from: 'draft', to: 'published', by: ['editor'] },
  { from: 'private', to: 'published', by: ['editor'] },
  { from: 'changes_requested', to: 'published', by: ['editor'] },
  { from: 'needs_fix', to: 'published', by: ['editor'] },
];

/** True when `actor` may move a route from `from` to `to`; a status never moves to itself. */
export function canMoveRoute(from: RouteStatus, to: RouteStatus, actor: RouteActor): boolean {
  return routeTransitions.some(
    (transition) =>
      transition.from === from && transition.to === to && transition.by.includes(actor),
  );
}

/** Statuses the author sets with `POST /routes/:id/status` (wiki API › Création). */
export const authorStatusTargets = ['private', 'draft', 'unpublished'] as const;
export type AuthorStatusTarget = (typeof authorStatusTargets)[number];

/** Statuses in which the public reads a route: the only ones its featured rows survive in. */
export const publicRouteStatuses: readonly RouteStatus[] = ['published'];

/**
 * Statuses in which a route is online for everyone, `needs_fix` with its banner (wiki API ›
 * Fiche): the routes of a deleted account that stay, signed « Membre Widoo » (D-025).
 */
export const onlineRouteStatuses = [
  'published',
  'needs_fix',
] as const satisfies readonly RouteStatus[];

/**
 * How the author edits a route of this status: `in_place` writes the route itself; `revision` a
 * working copy, the published version staying online until the copy is validated; `null` refuses
 * any edit (awaiting moderation, refused until « Reprendre », withdrawn).
 */
export function routeEditModeOf(status: RouteStatus): 'in_place' | 'revision' | null {
  switch (status) {
    case 'draft':
    case 'private':
    case 'changes_requested':
    case 'needs_fix':
      return 'in_place';
    case 'published':
      return 'revision';
    case 'pending':
    case 'rejected':
    case 'unpublished':
      return null;
  }
}

/**
 * Status a submission moves the route to, or `null` when its status cannot be submitted. A
 * published route is not moved: its revision is (`revision`). An editor publishes at once.
 */
export function submissionOf(
  status: RouteStatus,
  actor: 'author' | 'editor',
): 'pending' | 'published' | 'revision' | null {
  if (status === 'published') {
    return 'revision';
  }
  const to = actor === 'editor' ? 'published' : 'pending';
  return canMoveRoute(status, to, actor) ? to : null;
}

/**
 * Status of a revision (`route_revisions`): the working copy of a published route, edited
 * (`draft`), submitted (`pending`), then decided in moderation like a route.
 */
export const routeRevisionStatuses = [
  'draft',
  'pending',
  'changes_requested',
  'rejected',
  'published',
] as const;
export type RouteRevisionStatus = (typeof routeRevisionStatuses)[number];

/** A route has one open revision at most: the one in these statuses. */
export const openRevisionStatuses = [
  'draft',
  'pending',
  'changes_requested',
] as const satisfies readonly RouteRevisionStatus[];

/** True when the author still edits a revision of this status (not while it awaits moderation). */
export function isRevisionEditable(status: RouteRevisionStatus): boolean {
  return status === 'draft' || status === 'changes_requested';
}
