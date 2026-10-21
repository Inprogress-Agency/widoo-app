import { describe, expect, it } from 'vitest';
import {
  canMoveRoute,
  isRevisionEditable,
  routeEditModeOf,
  routeRevisionStatuses,
  submissionOf,
  taxonomies,
  type RouteActor,
  type RouteStatus,
} from '.';

const actors: RouteActor[] = ['author', 'editor', 'moderator', 'system'];

/** Every allowed move, written out from the diagram of Creation-et-Moderation. */
const allowed = new Set([
  'draft>private:author',
  'draft>pending:author',
  'private>pending:author',
  'pending>published:moderator',
  'pending>changes_requested:moderator',
  'pending>rejected:moderator',
  'changes_requested>pending:author',
  'published>needs_fix:system',
  'published>needs_fix:moderator',
  'needs_fix>pending:author',
  'published>unpublished:author',
  'published>unpublished:moderator',
  'needs_fix>unpublished:moderator',
  'unpublished>published:moderator',
  'rejected>draft:author',
  'draft>published:editor',
  'private>published:editor',
  'changes_requested>published:editor',
  'needs_fix>published:editor',
]);

const moves = taxonomies.routeStatuses.flatMap((from) =>
  taxonomies.routeStatuses.flatMap((to) => actors.map((actor) => ({ from, to, actor }))),
);

describe('canMoveRoute', () => {
  it.each(moves.filter(({ from, to, actor }) => allowed.has(`${from}>${to}:${actor}`)))(
    'lets $actor move $from to $to',
    ({ from, to, actor }) => {
      expect(canMoveRoute(from, to, actor)).toBe(true);
    },
  );

  it.each(moves.filter(({ from, to, actor }) => !allowed.has(`${from}>${to}:${actor}`)))(
    'refuses $actor moving $from to $to',
    ({ from, to, actor }) => {
      expect(canMoveRoute(from, to, actor)).toBe(false);
    },
  );
});

describe('routeEditModeOf', () => {
  it.each<[RouteStatus, ReturnType<typeof routeEditModeOf>]>([
    ['draft', 'in_place'],
    ['private', 'in_place'],
    ['changes_requested', 'in_place'],
    ['needs_fix', 'in_place'],
    ['published', 'revision'],
    ['pending', null],
    ['rejected', null],
    ['unpublished', null],
  ])('edits a %s route: %s', (status, mode) => {
    expect(routeEditModeOf(status)).toBe(mode);
  });
});

describe('submissionOf', () => {
  it.each<[RouteStatus, ReturnType<typeof submissionOf>, ReturnType<typeof submissionOf>]>([
    ['draft', 'pending', 'published'],
    ['private', 'pending', 'published'],
    ['changes_requested', 'pending', 'published'],
    ['needs_fix', 'pending', 'published'],
    ['published', 'revision', 'revision'],
    ['pending', null, null],
    ['rejected', null, null],
    ['unpublished', null, null],
  ])('submits a %s route: %s by its author, %s by an editor', (status, byAuthor, byEditor) => {
    expect(submissionOf(status, 'author')).toBe(byAuthor);
    expect(submissionOf(status, 'editor')).toBe(byEditor);
  });
});

describe('isRevisionEditable', () => {
  it('edits a revision until it is submitted, and again when changes are requested', () => {
    expect(routeRevisionStatuses.filter(isRevisionEditable)).toEqual([
      'draft',
      'changes_requested',
    ]);
  });
});
