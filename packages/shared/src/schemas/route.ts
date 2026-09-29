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

/** Fields of a search result card, shared with the full route sheet. */
const routeCardShape = {
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
  /** Number of steps of the route, whether or not `steps` carries them all. */
  stepCount: z.number().int().nonnegative(),
  /**
   * Map pins, in step order. A locked card carries its start alone: the steps 2 and after of a
   * Premium route never leave the API for a caller without the right to it (D-014, D-075).
   */
  steps: z.array(
    z.object({
      category: z.enum(taxonomies.placeCategories),
      location: LatLng,
      /** Place name, for the step line of the map tooltip. Null on a locked card (D-014). */
      name: z.string().min(1).nullable(),
      /** Time spent on the spot. Null on a locked card (D-014). */
      durationMin: z.number().int().positive().nullable(),
    }),
  ),
};

/**
 * Search result card (E-01, E-04). An unlocked card carries all its steps; a locked card its
 * start at most, unnamed, which the API answer is checked against before it is sent (D-075).
 */
export const RouteCard = z
  .object({
    ...routeCardShape,
    /**
     * True when a Premium route is locked for the caller: the app reads it, never `access`
     * alone, to choose what the map shows. Always false for a free route (D-075).
     */
    isLocked: z.boolean(),
  })
  .refine((card) => card.access === 'premium' || !card.isLocked, {
    path: ['isLocked'],
    message: 'A free route is never locked',
  })
  .refine(
    (card) =>
      card.isLocked
        ? card.steps.length <= Math.min(card.stepCount, 1) &&
          card.steps.every((step) => step.name === null && step.durationMin === null)
        : card.steps.length === card.stepCount,
    {
      path: ['steps'],
      message: 'A locked card carries its start alone, an unlocked card every step',
    },
  );
export type RouteCard = z.infer<typeof RouteCard>;

/** Full route sheet (E-05). */
export const RouteDetail = z.object(routeCardShape).extend({
  status: z.enum(taxonomies.routeStatuses),
  description: z.string(),
  photoUrls: z.array(HttpsUrl),
  conditions: z.array(z.enum(taxonomies.conditions)),
  transport: z.enum(taxonomies.transports),
  walkingDistanceM: z.number().nonnegative(),
  steps: z.array(Step),
});
export type RouteDetail = z.infer<typeof RouteDetail>;
