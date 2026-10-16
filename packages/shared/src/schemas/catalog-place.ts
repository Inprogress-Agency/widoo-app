import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, LatLng, plainText } from './common';
import { PlaceHours } from './place';

/** Columns the list of places of the catalog sorts by; by name by default. */
export const catalogPlaceSorts = ['name', 'category', 'city', 'verified', 'routes'] as const;
export type CatalogPlaceSort = (typeof catalogPlaceSorts)[number];

/** Query of `GET /admin/places`: search, filters, sort and page (A-04). */
export const CatalogPlacesQuery = z.strictObject({
  /** Text searched in the name and in the address. */
  q: z.string().trim().min(1).max(100).optional(),
  category: z.enum(taxonomies.placeCategories).optional(),
  status: z.enum(taxonomies.verificationStatuses).optional(),
  sort: z.enum(catalogPlaceSorts).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
  cursor: z.string().max(200).optional(),
});
export type CatalogPlacesQuery = z.infer<typeof CatalogPlacesQuery>;

/** A place of the catalog, as its row shows it (A-04). */
export const CatalogPlace = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.enum(taxonomies.placeCategories),
  cityName: z.string(),
  verificationStatus: z.enum(taxonomies.verificationStatuses),
  verifiedAt: z.iso.datetime().nullable(),
  /** Routes that go through the place, whatever their status. */
  routeCount: z.number().int().nonnegative(),
});
export type CatalogPlace = z.infer<typeof CatalogPlace>;

/** Body of `GET /admin/places`. */
export const CatalogPlaces = z.object({
  items: z.array(CatalogPlace),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type CatalogPlaces = z.infer<typeof CatalogPlaces>;

/**
 * What the team writes of a place (A-04), on creation and on edition alike: the whole sheet is
 * sent, and its opening hours replace the previous ones. The city is never sent: it follows
 * from the position. The verification status has its own actions (A-03).
 */
export const CatalogPlaceInput = z
  .strictObject({
    name: plainText(120),
    category: z.enum(taxonomies.placeCategories),
    address: plainText(240),
    location: LatLng,
    isIndoor: z.boolean(),
    priceRange: z.enum(taxonomies.priceRanges).nullable(),
    websiteUrl: HttpsUrl.nullable(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 .()-]{6,24}$/, 'Expected a phone number')
      .nullable(),
    hours: z.array(PlaceHours).max(60),
    /**
     * The booking link of a partner program of Widoo (A-09, D-048) and the program it belongs to.
     * Both are sent together, or none: left out, the place keeps the link it has. Without a link
     * there is no program.
     */
    partnerBookingUrl: HttpsUrl.nullable().optional(),
    partnerProgramId: z.uuid().nullable().optional(),
  })
  .refine(
    (place) => (place.partnerBookingUrl === undefined) === (place.partnerProgramId === undefined),
    {
      message: 'Send the partner link and its program together',
      path: ['partnerProgramId'],
    },
  )
  .refine((place) => place.partnerBookingUrl !== null || !place.partnerProgramId, {
    message: 'A program needs a partner link',
    path: ['partnerProgramId'],
  });
export type CatalogPlaceInput = z.infer<typeof CatalogPlaceInput>;

/** Body of `GET /admin/places/:id`: the sheet of a place, and the routes that use it. */
export const CatalogPlaceDetail = CatalogPlace.extend({
  address: z.string(),
  location: LatLng,
  isIndoor: z.boolean(),
  priceRange: z.enum(taxonomies.priceRanges).nullable(),
  websiteUrl: z.string().nullable(),
  phone: z.string().nullable(),
  /** The partner link of Widoo and its program (A-09). */
  partnerBookingUrl: z.string().nullable(),
  partnerProgramId: z.uuid().nullable(),
  hours: z.array(PlaceHours),
  routes: z.array(
    z.object({ id: z.uuid(), title: z.string(), status: z.enum(taxonomies.routeStatuses) }),
  ),
});
export type CatalogPlaceDetail = z.infer<typeof CatalogPlaceDetail>;
