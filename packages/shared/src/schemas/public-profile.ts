import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl } from './common';
import { CertificationCriterion, ProfileAnecdote } from './profile';
import { RouteCard } from './route';

/** Sorts of « Tous ses parcours » on a public profile (E-16, as on E-09). */
export const profileRouteSorts = ['recent', 'rating', 'duration'] as const;
export type ProfileRouteSort = (typeof profileRouteSorts)[number];

/** Query of `GET /users/:id/profile`: the sort, the moods and the page of the published routes. */
export interface PublicProfileQuery {
  sort?: ProfileRouteSort;
  moods?: readonly (typeof taxonomies.moods)[number][];
  cursor?: string;
}

const count = z.number().int().nonnegative();

/**
 * Body of `GET /users/:id/profile` (wiki API › Découverte, D-023): what a visitor sees of a
 * creator. Each figure is null when it does not exist, `verifiedPlaces` null at zero (D-056).
 * 404 when the profile is not public or the account deleted. Not strict, so that a build already
 * in the stores keeps reading a field added later.
 */
export const PublicProfile = z.object({
  id: z.uuid(),
  firstName: z.string().min(1),
  avatarUrl: HttpsUrl.nullable(),
  createdAt: z.iso.datetime(),
  neighborhood: z.string().nullable(),
  bio: z.string().nullable(),
  certified: z.boolean(),
  /** The criteria of the badge with the creator's values, for the « Créateur certifié » sheet. */
  certification: z.object({ criteria: z.array(CertificationCriterion) }),
  routesPublished: count.nullable(),
  routesCompleted: count.nullable(),
  ratingAvg: z.number().min(0).max(5).nullable(),
  verifiedPlaces: count.nullable(),
  /** In display order, with the label of each question. */
  anecdotes: z.array(ProfileAnecdote),
  /** The routes the creator chose, in their order. */
  featuredRoutes: z.array(RouteCard),
  /** The published routes, sorted and filtered by the query; `nextCursor` null on the last page. */
  routes: z.object({ items: z.array(RouteCard), nextCursor: z.string().nullable() }),
  /** Published routes by mood, for the chips of « Tous ses parcours ». */
  moodCounts: z.partialRecord(z.enum(taxonomies.moods), count),
});
export type PublicProfile = z.infer<typeof PublicProfile>;
