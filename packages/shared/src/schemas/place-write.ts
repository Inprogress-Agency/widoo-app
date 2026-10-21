/**
 * Search, creation and edition of places (wiki API › Lieux, E-13, D-049): what the creator of a
 * route types to find an existing place first, or to add the one that is missing.
 */
import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, LatLng, Latitude, Longitude, plainText } from './common';
import { SearchText } from './geocode';
import { Place, PlaceHours } from './place';

/** Name of a place, as long as a step title. */
export const placeNameMaxLength = 80;
/** Formatted address, one line. */
export const placeAddressMaxLength = 200;
/** Places one account creates in 24 hours (wiki Securite-et-RGPD › Limitation de débit). */
export const placeCreationDailyLimit = 20;
/** A place this close (in metres) to the new one, with a close name, is offered instead (E-13). */
export const placeDuplicateRadiusM = 50;
/** Similarity (0 to 1) of two names from which they are close, `pg_trgm` scale. */
export const placeDuplicateNameSimilarity = 0.4;
/** Slots of the hours of a place: seven days, a few slots each. */
export const placeHoursMax = 28;

const numbers = z
  .string()
  .transform((value) => value.split(',').map((part) => (part.trim() ? Number(part) : Number.NaN)));

/**
 * Query string of `GET /places/search`: the text, the position the places are sorted around and
 * the category, at least the text or the position.
 */
export const PlaceSearchQuery = z
  .strictObject({
    q: SearchText.optional(),
    /** `near=lat,lng`. */
    near: numbers
      .pipe(z.tuple([Latitude, Longitude]))
      .transform(([lat, lng]) => ({ lat, lng }))
      .optional(),
    category: z.enum(taxonomies.placeCategories).optional(),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .refine((query) => query.q !== undefined || query.near !== undefined, {
    path: ['q'],
    message: 'Required without near',
  });
export type PlaceSearchQuery = z.infer<typeof PlaceSearchQuery>;

/** A place found, with its distance to `near` when given. */
export const PlaceSearchHit = Place.omit({ hours: true }).extend({
  distanceM: z.number().min(0).nullable(),
});
export type PlaceSearchHit = z.infer<typeof PlaceSearchHit>;

export const PlaceSearchResult = z.object({ items: z.array(PlaceSearchHit) });
export type PlaceSearchResult = z.infer<typeof PlaceSearchResult>;

const AddressComponents = z.strictObject({
  street: plainText(120).optional(),
  postcode: plainText(10).optional(),
  arrondissement: plainText(20).optional(),
  neighborhood: plainText(80).optional(),
});

/** The fields of a place its creator writes; hours replace the whole week. */
const placeFields = {
  name: plainText(placeNameMaxLength),
  category: z.enum(taxonomies.placeCategories),
  location: LatLng,
  address: plainText(placeAddressMaxLength),
  addressComponents: AddressComponents.optional(),
  isIndoor: z.boolean(),
  priceRange: z.enum(taxonomies.priceRanges).nullable(),
  websiteUrl: HttpsUrl.max(300).nullable(),
  phone: plainText(30).nullable(),
  /** « Accessible à toute heure » (a park, a street): no hours (D-049). */
  alwaysOpen: z.boolean(),
  hours: z.array(PlaceHours).max(placeHoursMax),
};

/** `POST /places`. `force` creates the place although a close one exists (E-13 › « Créer quand même »). */
export const CreatePlace = z.strictObject({
  name: placeFields.name,
  category: placeFields.category,
  location: placeFields.location,
  address: placeFields.address,
  addressComponents: placeFields.addressComponents,
  isIndoor: placeFields.isIndoor.default(false),
  priceRange: placeFields.priceRange.default(null),
  websiteUrl: placeFields.websiteUrl.default(null),
  phone: placeFields.phone.default(null),
  alwaysOpen: placeFields.alwaysOpen.default(false),
  hours: placeFields.hours.default([]),
  force: z.boolean().default(false),
});
export type CreatePlace = z.infer<typeof CreatePlace>;

/** `PATCH /places/:id`: the fields that change, at least one. */
export const UpdatePlace = z
  .strictObject({
    name: placeFields.name,
    category: placeFields.category,
    location: placeFields.location,
    address: placeFields.address,
    addressComponents: placeFields.addressComponents,
    isIndoor: placeFields.isIndoor,
    priceRange: placeFields.priceRange,
    websiteUrl: placeFields.websiteUrl,
    phone: placeFields.phone,
    alwaysOpen: placeFields.alwaysOpen,
    hours: placeFields.hours,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'At least one field');
export type UpdatePlace = z.infer<typeof UpdatePlace>;

/** `details` of the 409 `conflict` of `POST /places`: the place E-13 offers instead. */
export const PlaceDuplicateDetails = z.object({
  reason: z.literal('similar_place'),
  candidate: PlaceSearchHit,
});
export type PlaceDuplicateDetails = z.infer<typeof PlaceDuplicateDetails>;
