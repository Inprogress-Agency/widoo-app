import type { PublicProfile, PublicProfileQuery } from '@widoo/shared';
import { ApiRequestError } from './errors';

/**
 * What `GET /v1/users/:id/profile` gives the public profile (E-16): the profile, or nothing to
 * show when it is masked or the account deleted, a 404 the screen shows as its own state. Any
 * other failure is thrown as an `ApiRequestError`.
 */
export type PublicProfileAnswer =
  { kind: 'profile'; profile: PublicProfile } | { kind: 'unavailable' };

/**
 * Path of a public profile: `sort`, the moods as their key repeated (`moods=food&moods=nature`)
 * and the page of « Tous ses parcours »; the server sorts by default.
 */
export function publicProfilePath(id: string, query: PublicProfileQuery = {}): `/v1/${string}` {
  const path = `/v1/users/${encodeURIComponent(id)}/profile` as const;
  const params = new URLSearchParams();
  if (query.sort) {
    params.set('sort', query.sort);
  }
  for (const mood of query.moods ?? []) {
    params.append('moods', mood);
  }
  if (query.cursor) {
    params.set('cursor', query.cursor);
  }
  const search = params.toString();
  return search === '' ? path : `${path}?${search}`;
}

/** A masked profile or a deleted account: 404. */
export function isProfileUnavailable(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404;
}
