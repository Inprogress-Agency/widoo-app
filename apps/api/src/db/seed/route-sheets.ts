/**
 * Route sheets of the demo dataset (E-05), as `GET /v1/routes/:id` will answer them (#36), for
 * the app to show the sheet until that route exists: `pnpm fixtures:route-sheets` writes them in
 * `apps/mobile/src/route/generated/route-sheets.json`. Same ids, places and photos as the seed;
 * transitions estimated by the orchestration without a directions provider; a timeline from the
 * default start, without conflicts (#35 computes them). Four more sheets show the states of the
 * sheet, all fictitious: a locked Premium route, a private one, one with a reported place, and a
 * withdrawn route.
 */
import { fileURLToPath } from 'node:url';
import { computeTransitions } from '@widoo/orchestration';
import type {
  LatLng,
  RouteDetail,
  RouteDetailStep,
  RouteRemovedDetails,
  RouteReview,
  SheetStep,
} from '@widoo/shared';
import { seedId } from '../seed';
import { bucketsOf, demoDataset, type DemoPlace, type DemoRoute } from './demo-routes';

/** Where the app reads them. */
export const routeSheetFixturesPath = fileURLToPath(
  new URL('../../../../mobile/src/route/generated/route-sheets.json', import.meta.url),
);

/** What the app reads: the sheets, and the withdrawn routes with their date. */
export interface RouteSheetFixtures {
  routes: RouteDetail[];
  removed: ({ id: string } & RouteRemovedDetails)[];
}

const { datasetDate, places, routes, authors } = demoDataset;
const day = datasetDate.slice(0, 10);
const placeOf = new Map(places.map((place) => [place.key, place]));
const minute = 60_000;

/**
 * The start of the creator, or the default one (Orchestration › Timeline): 14:00 for a half day,
 * else 10:00, in Paris.
 */
function startOf(route: DemoRoute): Date {
  const time =
    route.suggestedStart ?? (bucketsOf(route).durationBucket === 'half_day' ? '14:00' : '10:00');
  const offset = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(datasetDate))
    .find((part) => part.type === 'timeZoneName')
    ?.value.replace('GMT', '');
  return new Date(`${day}T${time}:00${offset ?? '+00:00'}`);
}

function placeOfStep(key: string): DemoPlace {
  const place = placeOf.get(key);
  if (!place) throw new Error(`Unknown place ${key}`);
  return place;
}

const hoursOf = (place: DemoPlace) =>
  place.hours.flatMap(({ weekdays, opens, closes }) =>
    weekdays.map((weekday) => ({ weekday, opens, closes, validFrom: null, validTo: null })),
  );

async function sheetOf(route: DemoRoute): Promise<RouteDetail> {
  const stepPlaces = route.steps.map((step) => placeOfStep(step.place));
  // Walking routes take the proposed mode of each trip; the bike route keeps the bike (D-048).
  const mode = route.transport === 'bike' ? 'bike' : null;
  const transitions = await computeTransitions(
    stepPlaces.map((place): { location: LatLng; mode: typeof mode } => ({
      location: place.location,
      mode,
    })),
    { directions: null, cache: null },
  );
  const steps: RouteDetailStep[] = route.steps.map((step, position) => {
    const place = stepPlaces[position] as DemoPlace;
    const transition = transitions[position] ?? null;
    return {
      id: seedId(`step:${route.key}:${position}`),
      position,
      isLocked: false,
      title: null,
      description: step.description,
      durationMin: step.durationMin,
      costPerPersonEur: step.costPerPerson,
      bookingRequired: step.bookingRequired,
      bookingUrl: step.bookingUrl ?? null,
      bookingProvider: step.bookingProvider ?? null,
      bookingNote: step.bookingNote ?? null,
      bookingIsAffiliate: step.bookingIsAffiliate,
      endsOn: step.endsOn ?? null,
      transitionNote: step.transitionNote ?? null,
      transition: transition && {
        distanceM: transition.distanceM,
        durationMin: transition.durationMin,
        mode: transition.mode,
        estimated: transition.estimated,
        // Estimated without a provider: no line (D-088).
        geometry: null,
      },
      place: {
        id: seedId(`place:${place.key}`),
        name: place.name,
        category: place.category,
        location: place.location,
        address: place.address,
        isIndoor: place.isIndoor,
        photoUrl: null,
        verificationStatus: 'verified',
        verifiedAt: datasetDate,
        hours: hoursOf(place),
        photo: null,
      },
      // Fictitious visitors, so that the verification line reads as on a live route (D-056).
      verification: {
        confirmations: 3 + position * 2,
        lastConfirmedAt: datasetDate,
        reports: null,
      },
      highlights: step.highlights ?? [],
      photos: step.photos.map(({ url, credit }) => ({ url, credit: credit ?? null })),
    };
  });

  let at = startOf(route).getTime();
  const timelineSteps = steps.map((step) => {
    const arrivesAt = at;
    const leavesAt = arrivesAt + step.durationMin * minute;
    at = leavesAt + (step.transition?.durationMin ?? 0) * minute;
    return {
      stepId: step.id,
      arrivesAt: new Date(arrivesAt).toISOString(),
      leavesAt: new Date(leavesAt).toISOString(),
      conflicts: [],
    };
  });
  const start = stepPlaces[0] as DemoPlace;
  const author = authors.find((candidate) => candidate.key === route.author);

  return {
    id: seedId(`route:${route.key}`),
    title: route.title,
    coverUrl: route.photos[0]?.url ?? null,
    isOfficial: route.author === null,
    author: author
      ? { id: seedId(`user:${author.key}`), firstName: author.firstName, avatarUrl: null }
      : null,
    access: 'free',
    isVerified: true,
    moods: route.moods,
    audiences: route.audiences,
    conditions: route.conditions,
    transport: route.transport,
    district: start.addressComponents.arrondissement,
    neighborhood: start.addressComponents.neighborhood,
    durationMin: route.computed.duration_min,
    durationBucket: bucketsOf(route).durationBucket,
    budgetPerPersonEur: route.computed.budget_per_person_eur,
    budgetBucket: bucketsOf(route).budgetBucket,
    distanceM: route.computed.distance_m,
    rating: { average: null, count: 0 },
    stepCount: steps.length,
    isLocked: false,
    status: 'published',
    description: route.description,
    photoUrls: route.photos.map((photo) => photo.url),
    photos: route.photos.map((photo) => ({ url: photo.url, credit: null })),
    timezone: 'Europe/Paris',
    tips: route.tips,
    walkingDistanceM: route.computed.walking_m,
    effort: route.computed.effort,
    startAccess: null,
    creator: {
      routesPublished: routes.filter((other) => other.author === route.author).length,
      isCertified: false,
    },
    sharedBy: null,
    reviews: [],
    timeline: {
      startsAt: timelineSteps[0]?.arrivesAt ?? datasetDate,
      endsAt: new Date(at).toISOString(),
      steps: timelineSteps,
    },
    steps,
    myReport: null,
  };
}

/** A copy of a sheet under another id, for a state: its steps keep their places. */
function variant(sheet: RouteDetail, name: string): RouteDetail {
  const ids = new Map(sheet.steps.map((step) => [step.id, seedId(`fixture:${name}:${step.id}`)]));
  const idOf = (id: string) => ids.get(id) ?? id;
  return {
    ...sheet,
    id: seedId(`fixture:${name}`),
    steps: sheet.steps.map((step) => ({ ...step, id: idOf(step.id) })),
    timeline: {
      ...sheet.timeline,
      steps: sheet.timeline.steps.map((entry) => ({ ...entry, stepId: idOf(entry.stepId) })),
    },
  };
}

/** Step 2 and after of a Premium route for a caller without subscription (D-014). */
function locked(sheet: RouteDetail): RouteDetail {
  const steps = sheet.steps.map((step): SheetStep =>
    step.position === 0 || step.isLocked
      ? step
      : {
          id: step.id,
          position: step.position,
          isLocked: true,
          category: step.place.category,
          durationMin: step.durationMin,
          transition: step.transition,
        },
  );
  return { ...sheet, access: 'premium', isLocked: true, steps };
}

const daysBefore = (days: number) =>
  new Date(Date.parse(datasetDate) - days * 86_400_000).toISOString();

/** Fictitious reviews, first names only. */
const reviews: RouteReview[] = [
  {
    firstName: 'Inès',
    rating: 5,
    comment: 'Parfait pour un samedi à deux, on a tout fait à pied.',
    days: 4,
  },
  { firstName: 'Hugo', rating: 5, comment: 'Les adresses sont bonnes, le timing tient.', days: 8 },
  {
    firstName: 'Léa',
    rating: 4,
    comment: 'Très bien, un peu de monde au fallafel à midi.',
    days: 13,
  },
].map(({ days, ...review }, index) => ({
  id: seedId(`fixture:review:${index}`),
  ...review,
  createdAt: daysBefore(days),
}));

/** The second place reported closed by three visitors, the third not verified for four months. */
function reported(sheet: RouteDetail): RouteDetail {
  const steps = sheet.steps.map((step): SheetStep => {
    if (step.isLocked || step.position === 0) return step;
    if (step.position === 1) {
      return {
        ...step,
        place: { ...step.place, verificationStatus: 'flagged' },
        verification: {
          confirmations: 0,
          lastConfirmedAt: daysBefore(7),
          reports: { count: 3, lastAt: daysBefore(3) },
        },
      };
    }
    if (step.position === 2) {
      return {
        ...step,
        place: { ...step.place, verificationStatus: 'stale', verifiedAt: daysBefore(125) },
        verification: { confirmations: 0, lastConfirmedAt: daysBefore(125), reports: null },
      };
    }
    return step;
  });
  return { ...sheet, steps, rating: { average: 4.7, count: reviews.length }, reviews };
}

const sheetByKey = async (key: string) => {
  const route = routes.find((candidate) => candidate.key === key);
  if (!route) throw new Error(`Unknown route ${key}`);
  return sheetOf(route);
};

export async function routeSheetFixtures(): Promise<RouteSheetFixtures> {
  const sheets = await Promise.all(routes.map(sheetOf));
  const premium = locked(variant(await sheetByKey('montmartre-a-deux'), 'premium'));
  const shared = variant(await sheetByKey('canal-saint-martin-a-velo'), 'private');
  const flagged = reported(variant(await sheetByKey('marais-gourmand'), 'reported'));
  return {
    routes: [
      ...sheets,
      premium,
      { ...shared, status: 'private', isVerified: false, sharedBy: { firstName: 'Camille' } },
      flagged,
    ],
    removed: [
      { id: seedId('fixture:removed'), removedAt: daysBefore(5), near: { lat: 48.86, lng: 2.35 } },
    ],
  };
}
