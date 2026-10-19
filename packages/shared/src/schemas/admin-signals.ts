import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { plainText } from './common';

/** Rows of a page of the signals and ratings lists of the admin. */
export const adminSignalsPageSize = 50;

/** Query of `GET /admin/signals`: the places the community flagged, oldest check first (A-03). */
export const AdminSignalsQuery = z.strictObject({ cursor: z.string().max(200).optional() });
export type AdminSignalsQuery = z.infer<typeof AdminSignalsQuery>;

/**
 * A place waiting for the team in A-03, with the routes that go through it. The signals
 * themselves (their number, their reasons, the recent confirmations) come with `place_signals`
 * (wiki Modele-de-Donnees): until then they read as none.
 */
export const AdminSignaledPlace = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string(),
  cityName: z.string(),
  verificationStatus: z.enum(taxonomies.verificationStatuses),
  /** Null for a place never verified. */
  verifiedAt: z.iso.datetime().nullable(),
  /** Open signals on the place. */
  signalCount: z.number().int().nonnegative(),
  /** Confirmations since the last verification, weighted by trust. */
  confirmationCount: z.number().nonnegative(),
  /** Published routes that go through the place: they pass to `needs_fix` when it is closed. */
  routes: z.array(
    z.object({ id: z.uuid(), title: z.string(), status: z.enum(taxonomies.routeStatuses) }),
  ),
});
export type AdminSignaledPlace = z.infer<typeof AdminSignaledPlace>;

/** Body of `GET /admin/signals`. */
export const AdminSignaledPlaces = z.object({
  items: z.array(AdminSignaledPlace),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type AdminSignaledPlaces = z.infer<typeof AdminSignaledPlaces>;

/** Body of `POST /admin/places/:id/close`: why the place is closed, kept in the journal. */
export const ClosePlaceBody = z.strictObject({ reason: plainText(500) });
export type ClosePlaceBody = z.infer<typeof ClosePlaceBody>;

/** Answer of `verify` and `close`: the place as it stands, and the routes marked to correct. */
export const PlaceActionResult = z.object({
  placeId: z.uuid(),
  verificationStatus: z.enum(taxonomies.verificationStatuses),
  /** Routes passed to `needs_fix` by a closing; 0 for a verification. */
  routesToFix: z.number().int().nonnegative(),
});
export type PlaceActionResult = z.infer<typeof PlaceActionResult>;

/** `details` of a 409 `already_decided` on a place: the status it already has. */
export const PlaceAlreadyDecidedDetails = z.object({
  status: z.enum(taxonomies.verificationStatuses),
});
export type PlaceAlreadyDecidedDetails = z.infer<typeof PlaceAlreadyDecidedDetails>;

/** Query of `GET /admin/ratings`: ratings with a comment, filtered by note and by route (A-03). */
export const AdminRatingsQuery = z.strictObject({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  routeId: z.uuid().optional(),
  cursor: z.string().max(200).optional(),
});
export type AdminRatingsQuery = z.infer<typeof AdminRatingsQuery>;

/** A rating with a comment, as the team reads it. Ratings come with `route_ratings` (E-15). */
export const AdminRating = z.object({
  id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  isHidden: z.boolean(),
  createdAt: z.iso.datetime(),
  route: z.object({ id: z.uuid(), title: z.string() }),
  author: z.object({ id: z.uuid(), firstName: z.string().nullable() }).nullable(),
});
export type AdminRating = z.infer<typeof AdminRating>;

/** Body of `GET /admin/ratings`. */
export const AdminRatings = z.object({
  items: z.array(AdminRating),
  /** The routes that have a rating with a comment, the latest rated first: the choices of the route filter. */
  routes: z.array(z.object({ id: z.uuid(), title: z.string() })),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type AdminRatings = z.infer<typeof AdminRatings>;
