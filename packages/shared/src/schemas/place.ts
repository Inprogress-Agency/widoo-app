import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, LatLng } from './common';

/** One opening slot, several per day for split hours. No slot on a day: closed; none at all: unknown. */
export const PlaceHours = z.object({
  /** 0 = Monday. */
  weekday: z.number().int().min(0).max(6),
  opens: z.iso.time({ precision: -1 }),
  /** Not checked against `opens`: a slot may run past midnight. */
  closes: z.iso.time({ precision: -1 }),
  /** Seasonal hours; null when always valid. */
  validFrom: z.iso.date().nullable(),
  validTo: z.iso.date().nullable(),
});
export type PlaceHours = z.infer<typeof PlaceHours>;

export const Place = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  category: z.enum(taxonomies.placeCategories),
  location: LatLng,
  address: z.string().min(1),
  isIndoor: z.boolean(),
  photoUrl: HttpsUrl.nullable(),
  verificationStatus: z.enum(taxonomies.verificationStatuses),
  verifiedAt: z.iso.datetime().nullable(),
  hours: z.array(PlaceHours),
});
export type Place = z.infer<typeof Place>;
