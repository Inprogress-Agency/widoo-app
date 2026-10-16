import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, LatLng } from './common';
import { PlaceHours } from './place';
import { MyRouteRating } from './rating';
import { Step } from './route';
import { RouteTimeline } from './route-detail';

/**
 * A route planned by a user (wiki API › Favoris et programmation, Modele-de-Donnees ›
 * planned_routes): E-06 creates it, E-07 follows the Go, E-08 lists it, E-15 closes it.
 */

/**
 * Statuses of a planned route (D-029, D-033, D-038). `stopped`: « Arrêter le parcours », without
 * a note; `missed`: the day passed without a start, set by the job of 4:00 the next day. Technical
 * keys: the app shows its own labels (« Arrêté », « Pas fait »).
 */
export const plannedRouteStatuses = [
  'planned',
  'in_progress',
  'completed',
  'stopped',
  'cancelled',
  'missed',
] as const;
export type PlannedRouteStatus = (typeof plannedRouteStatuses)[number];

/** Statuses a user sets with `PATCH /me/planned/:id`; `missed` is the job's alone. */
export const settablePlannedRouteStatuses = [
  'planned',
  'in_progress',
  'completed',
  'stopped',
  'cancelled',
] as const satisfies readonly PlannedRouteStatus[];
export type SettablePlannedRouteStatus = (typeof settablePlannedRouteStatuses)[number];

/** Who closed a Go: the user, or the job of 4:00 for a Go left open (D-033). */
export const plannedRouteClosers = ['user', 'auto'] as const;
export type PlannedRouteCloser = (typeof plannedRouteClosers)[number];

/** Booking items a body may name: a route has 10 steps at most, kept loose for the settings. */
const checklistMaxItems = 50;

/** The place of a step as it was planned: enough to follow the Go and recompute the timeline. */
export const PlannedRoutePlace = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  category: z.enum(taxonomies.placeCategories),
  location: LatLng,
  address: z.string().min(1),
  isIndoor: z.boolean(),
  hours: z.array(PlaceHours),
});
export type PlannedRoutePlace = z.infer<typeof PlannedRoutePlace>;

export const PlannedRouteStep = Step.omit({ place: true }).extend({ place: PlannedRoutePlace });
export type PlannedRouteStep = z.infer<typeof PlannedRouteStep>;

/**
 * The route as the user planned it, frozen (`route_revision_snapshot`): a route unpublished or
 * edited afterwards stays readable in the planning as it was.
 */
export const PlannedRouteSnapshot = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  access: z.enum(taxonomies.plans),
  isOfficial: z.boolean(),
  /** IANA time zone of the city: opening hours are its local times. */
  timezone: z.string().min(1),
  steps: z.array(PlannedRouteStep).min(1),
});
export type PlannedRouteSnapshot = z.infer<typeof PlannedRouteSnapshot>;

/** A booking of « À préparer » (E-06): a step with `bookingRequired`, ticked or not. */
export const PlannedChecklistItem = z.object({ stepId: z.uuid(), isChecked: z.boolean() });
export type PlannedChecklistItem = z.infer<typeof PlannedChecklistItem>;

/** Progress of a step during the Go (E-07): « J'y suis », « Étape suivante », « Passer ». */
export const PlannedStepProgress = z.object({
  stepId: z.uuid(),
  arrivedAt: z.iso.datetime().nullable(),
  doneAt: z.iso.datetime().nullable(),
  /** A skipped step does not count as done (D-033). */
  skippedAt: z.iso.datetime().nullable(),
});
export type PlannedStepProgress = z.infer<typeof PlannedStepProgress>;

/** A planning of the caller, with its timeline, checklist and Go progress, in step order. */
export const PlannedRoute = z.object({
  id: z.uuid(),
  /** Null once the route itself is deleted: the snapshot stays. */
  routeId: z.uuid().nullable(),
  status: z.enum(plannedRouteStatuses),
  startsAt: z.iso.datetime(),
  /** « Terminer la sortie », or the automatic closing at 4:00. */
  completedAt: z.iso.datetime().nullable(),
  closedBy: z.enum(plannedRouteClosers).nullable(),
  route: PlannedRouteSnapshot,
  timeline: RouteTimeline,
  checklist: z.array(PlannedChecklistItem),
  steps: z.array(PlannedStepProgress),
  /**
   * The caller's rating of the route, from this outing or an earlier one (one per route, E-15);
   * null before it, and once the route is deleted.
   */
  myRating: MyRouteRating.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PlannedRoute = z.infer<typeof PlannedRoute>;

/** Start of a planning: an ISO 8601 date and time with its offset. */
const StartsAt = z.iso.datetime({ offset: true });

/** Body of `POST /me/planned`. */
export const CreatePlannedRoute = z.strictObject({ routeId: z.uuid(), startsAt: StartsAt });
export type CreatePlannedRoute = z.infer<typeof CreatePlannedRoute>;

/**
 * Body of `PATCH /me/planned/:id`: at least one field. `checklist` ticks or unticks the bookings
 * it names, each once; the others keep their state. No personal note any more (D-029).
 */
export const UpdatePlannedRoute = z
  .strictObject({
    startsAt: StartsAt,
    status: z.enum(settablePlannedRouteStatuses),
    checklist: z
      .array(z.strictObject({ stepId: z.uuid(), isChecked: z.boolean() }))
      .min(1)
      .max(checklistMaxItems)
      .refine(
        (items) => new Set(items.map((item) => item.stepId)).size === items.length,
        'Each step once',
      ),
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Nothing to update');
export type UpdatePlannedRoute = z.infer<typeof UpdatePlannedRoute>;

/** Query of `GET /me/planned`. */
export const PlannedRouteQuery = z.strictObject({
  status: z.enum(plannedRouteStatuses).optional(),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PlannedRouteQuery = z.infer<typeof PlannedRouteQuery>;

export const PlannedRouteList = z.object({
  items: z.array(PlannedRoute),
  nextCursor: z.string().nullable(),
});
export type PlannedRouteList = z.infer<typeof PlannedRouteList>;

/** Answer of `GET /me/planned/:id/maps-url`: Google Maps on foot to the next step (D-032). */
export const PlannedMapsUrl = z.object({ stepId: z.uuid(), url: HttpsUrl });
export type PlannedMapsUrl = z.infer<typeof PlannedMapsUrl>;
