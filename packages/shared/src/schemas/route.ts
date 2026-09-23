import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, LatLng } from './common';
import { Place } from './place';

const euros = z.number().nonnegative();

export const Step = z.object({
  id: z.uuid(),
  position: z.number().int().nonnegative(),
  /** Null: the place name is shown instead. */
  title: z.string().nullable(),
  description: z.string().nullable(),
  durationMin: z.number().int().positive(),
  costPerPersonEur: euros.nullable(),
  bookingRequired: z.boolean(),
  bookingUrl: HttpsUrl.nullable(),
  bookingProvider: z.enum(taxonomies.bookingProviders).nullable(),
  transitionNote: z.string().nullable(),
  transition: z
    .object({
      distanceM: z.number().nonnegative(),
      durationMin: z.number().nonnegative(),
      mode: z.enum(taxonomies.transports),
      /** Straight-line fallback, used when the directions provider is unavailable. */
      estimated: z.boolean(),
    })
    .nullable(),
  place: Place,
});
export type Step = z.infer<typeof Step>;

const Author = z.object({
  id: z.uuid(),
  firstName: z.string(),
  avatarUrl: HttpsUrl.nullable(),
});

/** Search result card (E-01, E-04). */
export const RouteCard = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  coverUrl: HttpsUrl.nullable(),
  /** « Par Widoo »: `author` is then null. */
  isOfficial: z.boolean(),
  author: Author.nullable(),
  /** `premium`: signature route, which only Premium users can plan. */
  access: z.enum(taxonomies.plans),
  isVerified: z.boolean(),
  moods: z.array(z.enum(taxonomies.moods)),
  audiences: z.array(z.enum(taxonomies.audiences)),
  /** Arrondissement and neighbourhood of the start, as displayed (« 3e », « Le Marais »). */
  district: z.string().nullable(),
  neighborhood: z.string().nullable(),
  durationMin: z.number().int().nonnegative(),
  durationBucket: z.enum(taxonomies.durations),
  budgetPerPersonEur: z.object({ min: euros, max: euros }),
  budgetBucket: z.enum(taxonomies.budgets),
  distanceM: z.number().nonnegative(),
  rating: z.object({
    /** Null until the first rating. */
    average: z.number().min(1).max(5).nullable(),
    count: z.number().int().nonnegative(),
  }),
  /** Map pins, in step order. */
  steps: z.array(z.object({ category: z.enum(taxonomies.placeCategories), location: LatLng })),
});
export type RouteCard = z.infer<typeof RouteCard>;

/** Full route sheet (E-05). */
export const RouteDetail = RouteCard.extend({
  status: z.enum(taxonomies.routeStatuses),
  description: z.string(),
  photoUrls: z.array(HttpsUrl),
  conditions: z.array(z.enum(taxonomies.conditions)),
  transport: z.enum(taxonomies.transports),
  walkingDistanceM: z.number().nonnegative(),
  steps: z.array(Step),
});
export type RouteDetail = z.infer<typeof RouteDetail>;
