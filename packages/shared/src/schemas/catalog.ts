import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { MessageToAuthor } from './moderation';

/** Columns the list of routes of the catalog sorts by; the last change first by default. */
export const catalogRouteSorts = ['updated', 'title', 'author', 'city', 'rating'] as const;
export type CatalogRouteSort = (typeof catalogRouteSorts)[number];

/** Rows of a page of the catalog. */
export const catalogPageSize = 50;

/** Query of `GET /admin/routes`: search, filters, sort and page (A-04). */
export const CatalogRoutesQuery = z.strictObject({
  /** Text searched in the title and in the first name of the author. */
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(taxonomies.routeStatuses).optional(),
  access: z.enum(taxonomies.plans).optional(),
  sort: z.enum(catalogRouteSorts).default('updated'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().max(200).optional(),
});
export type CatalogRoutesQuery = z.infer<typeof CatalogRoutesQuery>;

/** A route of the catalog, as its row shows it (A-04). */
export const CatalogRoute = z.object({
  id: z.uuid(),
  title: z.string(),
  status: z.enum(taxonomies.routeStatuses),
  access: z.enum(taxonomies.plans),
  /** « Par Widoo »: a route of the team. */
  isOfficial: z.boolean(),
  /** Null for a route of the team, or once the account of the author is purged. */
  author: z.object({ id: z.uuid(), firstName: z.string().nullable() }).nullable(),
  cityName: z.string(),
  rating: z.object({
    /** Null until the first rating. */
    average: z.number().min(1).max(5).nullable(),
    count: z.number().int().nonnegative(),
  }),
  updatedAt: z.iso.datetime(),
});
export type CatalogRoute = z.infer<typeof CatalogRoute>;

/** Body of `GET /admin/routes`. */
export const CatalogRoutes = z.object({
  items: z.array(CatalogRoute),
  total: z.number().int().nonnegative(),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type CatalogRoutes = z.infer<typeof CatalogRoutes>;

/** Body of `POST /admin/routes/:id/republish`: why the route goes back online. */
export const RepublishBody = z.strictObject({ message: MessageToAuthor });
export type RepublishBody = z.infer<typeof RepublishBody>;

/** Answer of a catalog action on a route: the route as it stands afterwards. */
export const CatalogRouteAction = z.object({
  routeId: z.uuid(),
  status: z.enum(taxonomies.routeStatuses),
  isOfficial: z.boolean(),
});
export type CatalogRouteAction = z.infer<typeof CatalogRouteAction>;
