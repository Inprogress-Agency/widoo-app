import { z } from 'zod';
import { reportStatuses } from '../reports';
import { taxonomies } from '../taxonomies';
import { LatLng } from './common';
import { Place } from './place';
import {
  Photo,
  routeCardFields,
  Step,
  StepHighlightList,
  StepPhotos,
  StepTransition,
} from './route';

/**
 * Answer of `GET /v1/routes/:id` and `GET /v1/routes/:id/timeline` (wiki API › Fiche parcours,
 * D-093), which the route sheet reads (Ecrans › E-05).
 */

const count = z.number().int().nonnegative();
const meters = z.number().nonnegative();

/** Effort of a route: the walk under 3 km is easy, under 7 km moderate (Orchestration › Agrégats). */
export const routeEfforts = ['easy', 'moderate', 'intense'] as const;
export type RouteEffort = (typeof routeEfforts)[number];

/** Conflicts of a timeline with the opening hours (Orchestration › Timeline). */
export const timelineConflicts = [
  'closed_at_arrival',
  'closed_that_day',
  'closes_during_step',
  'hours_unknown',
] as const;
export type TimelineConflict = (typeof timelineConflicts)[number];

/** Times of a step for a start: arrival and departure, and its conflicts with the hours. */
export const TimelineStep = z.object({
  stepId: z.uuid(),
  arrivesAt: z.iso.datetime(),
  leavesAt: z.iso.datetime(),
  conflicts: z.array(z.enum(timelineConflicts)),
});
export type TimelineStep = z.infer<typeof TimelineStep>;

/**
 * Timeline of a route for a start (`startsAt=`), one entry per step in step order; `endsAt` is
 * « Fin du parcours ». The sheet carries the one of the suggested start, today.
 */
export const RouteTimeline = z.object({
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  steps: z.array(TimelineStep),
});
export type RouteTimeline = z.infer<typeof RouteTimeline>;

/**
 * What the visitors said of the place of a step (D-013, D-056), read only in the sheet: the
 * confirmations since its last verification, and its open reports.
 */
export const PlaceVerification = z.object({
  /** Visitors who confirmed the place since it was last verified. */
  confirmations: count,
  /** Last visit without a problem; null for a place never verified (« Pas encore vérifié »). */
  lastConfirmedAt: z.iso.datetime().nullable(),
  /** Open reports that the place is closed; null without one. */
  reports: z.object({ count: z.number().int().positive(), lastAt: z.iso.datetime() }).nullable(),
});
export type PlaceVerification = z.infer<typeof PlaceVerification>;

/**
 * A trip of the sheet. Exact when Mapbox answered for this answer only, with its route along the
 * streets (D-088, #154); else our estimate, without a line.
 */
export const SheetTransition = StepTransition.extend({
  /** Encoded polyline, precision 5; null for an estimated trip, the metro, or no move at all. */
  geometry: z.string().min(1).nullable(),
});
export type SheetTransition = z.infer<typeof SheetTransition>;

/** The place of a full step, with its main photo and its credit (D-052). */
export const SheetPlace = Place.extend({ photo: Photo.nullable() });
export type SheetPlace = z.infer<typeof SheetPlace>;

/** A step the caller may see in full. */
export const RouteDetailStep = Step.extend({
  isLocked: z.literal(false),
  transition: SheetTransition.nullable(),
  place: SheetPlace,
  /** Booking detail typed by the creator, 80 characters (D-048). */
  bookingNote: z.string().nullable(),
  /** « Lien affilié » under « Réserver » (D-048, D-052). */
  bookingIsAffiliate: z.boolean(),
  /** Last day of an ephemeral step (D-050). */
  endsOn: z.iso.date().nullable(),
  verification: PlaceVerification,
  highlights: StepHighlightList,
  photos: StepPhotos,
});
export type RouteDetailStep = z.infer<typeof RouteDetailStep>;

/**
 * Step 2 and after of a Premium route for a caller without the right to it (D-014): its time,
 * category, duration and trip only; no place, coordinates nor advice leave the API.
 */
export const LockedStep = z.strictObject({
  id: z.uuid(),
  position: count,
  isLocked: z.literal(true),
  category: z.enum(taxonomies.placeCategories),
  durationMin: z.number().int().positive(),
  /** Always our estimate: no line is asked for a step the caller does not see (D-093). */
  transition: SheetTransition.nullable(),
});
export type LockedStep = z.infer<typeof LockedStep>;

export const SheetStep = z.discriminatedUnion('isLocked', [RouteDetailStep, LockedStep]);
export type SheetStep = z.infer<typeof SheetStep>;

/** One of the last visible reviews of a route (D-013): first name and date, no reply. */
export const RouteReview = z.object({
  id: z.uuid(),
  firstName: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type RouteReview = z.infer<typeof RouteReview>;

/**
 * The running report of the signed-in caller on the route (D-057): less than 7 days old and not
 * decided yet (`blocksNewRouteReport`), for « Signalé le … ».
 */
export const MyRouteReport = z.object({
  reportedAt: z.iso.datetime(),
  status: z.enum(reportStatuses),
});
export type MyRouteReport = z.infer<typeof MyRouteReport>;

/** Full route sheet (E-05), as the caller may see it. */
export const RouteDetail = z
  .object({
    ...routeCardFields,
    /** As on the card: a Premium route the caller has no right to (D-014, D-075). */
    isLocked: z.boolean(),
    status: z.enum(taxonomies.routeStatuses),
    description: z.string(),
    /** Photos of the carousel, the cover first, with the credit of a free photo (D-052). */
    photos: z.array(Photo),
    /** IANA zone of the city: the hours and the timeline are its local times. */
    timezone: z.string().min(1),
    /** « À prévoir », the lines of the creator (`routes.tips`, D-048), in their order. */
    tips: z.array(z.string().min(1)),
    walkingDistanceM: meters,
    effort: z.enum(routeEfforts),
    /** Station nearest the start (D-050); null until it is computed. */
    startAccess: z
      .object({ station: z.string().min(1), lines: z.array(z.string().min(1)), distanceM: meters })
      .nullable(),
    /** The creator box (D-023): its published routes and whether it is certified. */
    creator: z.object({ routesPublished: count, isCertified: z.boolean() }),
    /** A private route opened by its link: who shared it (« Partagé par Camille »). */
    sharedBy: z.object({ firstName: z.string().min(1) }).nullable(),
    /** The last three visible reviews, newest first. */
    reviews: z.array(RouteReview).max(3),
    /** Timeline of the suggested start, today: « Départ conseillé à 10:00 ». */
    timeline: RouteTimeline,
    steps: z.array(SheetStep),
    /** The caller's running report (D-057); null without one, and without a token. */
    myReport: MyRouteReport.nullable(),
  })
  .refine((route) => route.steps.length === route.stepCount, {
    path: ['steps'],
    message: 'A sheet carries every step, locked or not',
  })
  .refine((route) => route.access === 'premium' || !route.isLocked, {
    path: ['isLocked'],
    message: 'A free route is never locked',
  })
  .refine(
    (route) => route.steps.every((step, index) => step.isLocked === (route.isLocked && index > 0)),
    {
      path: ['steps'],
      message: 'A locked route shows its start in full and locks the others; else none is locked',
    },
  )
  .refine(
    (route) =>
      route.timeline.steps.length === route.steps.length &&
      route.timeline.steps.every((entry, index) => entry.stepId === route.steps[index]?.id),
    { path: ['timeline'], message: 'The timeline has one entry per step, in step order' },
  );
export type RouteDetail = z.infer<typeof RouteDetail>;

/**
 * `details` of the 410 `route_removed` of a withdrawn route (D-014, D-093): when, and the start
 * rounded to 0.01° (about 1 km) for « Voir des parcours proches », never the exact point.
 */
export const RouteRemovedDetails = z.object({ removedAt: z.iso.datetime(), near: LatLng });
export type RouteRemovedDetails = z.infer<typeof RouteRemovedDetails>;

/** `?token=` of a private link: the `share_token` of the route, URL-safe. */
const ShareToken = z.string().regex(/^[\w-]{16,64}$/);

/**
 * Query of `GET /routes/:id`: the token of a private link; `trips=estimated` for our estimates
 * only, without Mapbox nor line, cacheable (the site, D-093). Any other key: 400.
 */
export const RouteDetailQuery = z.strictObject({
  token: ShareToken.optional(),
  trips: z.literal('estimated').optional(),
});
export type RouteDetailQuery = z.infer<typeof RouteDetailQuery>;

/** Query of `GET /routes/:id/timeline`: the start, with its offset, as `POST /me/planned`. */
export const RouteTimelineQuery = z.strictObject({
  startsAt: z.iso.datetime({ offset: true }),
  token: ShareToken.optional(),
});
export type RouteTimelineQuery = z.infer<typeof RouteTimelineQuery>;
