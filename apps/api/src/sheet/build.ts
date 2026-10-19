/**
 * The sheet of a route from what `loadSheet` read and the trips of this answer (wiki API › Fiche
 * parcours, D-093): identity, buckets and budget of the card, the duration, distances, effort
 * and timeline of the trips served (Q6), every step in full or locked (D-014).
 */
import { computeRoute, type RouteInput, type Transition } from '@widoo/orchestration';
import type {
  MyRouteReport,
  RouteCard,
  RouteDetail,
  RouteReview,
  SheetStep,
  SheetTransition,
} from '@widoo/shared';
import { z } from 'zod';
import { httpsOrNull } from '../search/repository';
import type { LoadedSheet } from './load';

/** What `computed.access` holds (Orchestration › Accès, D-050); anything else reads as none. */
const AccessColumn = z.object({
  station: z.string().min(1),
  lines: z.array(z.object({ line: z.string().min(1) })),
  distance_m: z.number().nonnegative(),
});

/** The route as the orchestration reads it, on these trips. */
export function routeInputOf(
  { route, timezone, steps }: LoadedSheet,
  trips: readonly (Transition | null)[],
): RouteInput {
  return {
    title: route.title,
    description: route.description,
    hasPhoto: true,
    suggestedStart: route.suggestedStart?.slice(0, 5) ?? null,
    timeZone: timezone,
    steps: steps.map(({ step, place, hours }, index) => ({
      id: step.id,
      placeId: place.id,
      durationMin: step.durationMin,
      costPerPersonEur: step.costPerPerson,
      bookingRequired: step.bookingRequired,
      hasPhoto: true,
      transition: trips[index] ?? null,
      place: {
        location: place.location,
        hours,
        alwaysOpen: place.alwaysOpen,
        isIndoor: place.isIndoor,
        verificationStatus: place.verificationStatus,
        verifiedAt: place.verifiedAt?.toISOString() ?? null,
      },
    })),
  };
}

/** A trip as the sheet serves it: its line only when the provider gave one; the metro estimated. */
export function sheetTransitionOf(trip: Transition | null): SheetTransition | null {
  return (
    trip && {
      distanceM: trip.distanceM,
      durationMin: trip.durationMin,
      mode: trip.mode,
      estimated: trip.estimated || trip.mode === 'metro',
      geometry: trip.geometry ?? null,
    }
  );
}

export interface SheetParts {
  card: RouteCard;
  trips: readonly (Transition | null)[];
  reviews: RouteReview[];
  creator: RouteDetail['creator'];
  sharedBy: RouteDetail['sharedBy'];
  myReport: MyRouteReport | null;
  now: Date;
}

export function buildSheet(loaded: LoadedSheet, parts: SheetParts): RouteDetail {
  const { route, steps } = loaded;
  const { card, trips, now } = parts;
  const orchestrated = computeRoute(routeInputOf(loaded, trips), { now });
  const { computed, timeline } = orchestrated;
  if (!computed || !timeline) throw new Error(`Route ${route.id} has a card but no step`);
  const isLockedAt = (position: number) => card.isLocked && position > 0;
  const access = AccessColumn.safeParse(
    (route.computed as { access?: unknown } | null)?.access,
  ).data;

  const sheetSteps = steps.map(({ step, place, hours, photos, placePhoto }, position) => {
    const transition = sheetTransitionOf(trips[position] ?? null);
    if (isLockedAt(position)) {
      return {
        id: step.id,
        position,
        isLocked: true,
        category: place.category,
        durationMin: step.durationMin,
        transition,
      } satisfies SheetStep;
    }
    const bookingUrl = httpsOrNull(step.bookingUrl);
    return {
      id: step.id,
      position,
      isLocked: false,
      title: step.title,
      description: step.description,
      durationMin: step.durationMin,
      costPerPersonEur: step.costPerPerson,
      bookingRequired: step.bookingRequired,
      bookingUrl,
      bookingProvider: step.bookingProvider,
      bookingNote: step.bookingNote,
      bookingIsAffiliate: step.bookingIsAffiliate && bookingUrl !== null,
      endsOn: step.endsOn,
      transitionNote: step.transitionNote,
      transition,
      place: {
        id: place.id,
        name: place.name,
        category: place.category,
        location: place.location,
        address: place.address,
        isIndoor: place.isIndoor,
        photoUrl: placePhoto?.url ?? null,
        photo: placePhoto,
        verificationStatus: place.verificationStatus,
        verifiedAt: place.verifiedAt?.toISOString() ?? null,
        hours,
      },
      // No place signal is stored yet: the confirmations since the last verification only.
      verification: {
        confirmations: Math.floor(place.confirmationsSinceVerified),
        lastConfirmedAt: place.verifiedAt?.toISOString() ?? null,
        reports: null,
      },
      highlights: step.highlights ?? [],
      photos,
    } satisfies SheetStep;
  });

  // The card's own pins give way to the steps of the sheet.
  return {
    ...card,
    durationMin: computed.durationMin,
    distanceM: computed.distanceM,
    status: route.status,
    description: route.description ?? '',
    photoUrls: loaded.photos.map((photo) => photo.url),
    photos: loaded.photos,
    timezone: loaded.timezone,
    tips: route.tips,
    walkingDistanceM: computed.walkingM,
    effort: computed.effort,
    startAccess: access
      ? {
          station: access.station,
          lines: access.lines.map((line) => line.line),
          distanceM: access.distance_m,
        }
      : null,
    creator: parts.creator,
    sharedBy: parts.sharedBy,
    reviews: parts.reviews,
    // A locked step says nothing of the hours of a place the caller does not see (Q7).
    timeline: {
      ...timeline,
      steps: timeline.steps.map((entry, position) =>
        isLockedAt(position) ? { ...entry, conflicts: [] } : entry,
      ),
    },
    steps: sheetSteps,
    myReport: parts.myReport,
  };
}
