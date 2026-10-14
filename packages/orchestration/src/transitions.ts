/**
 * Transitions between consecutive steps (Orchestration › Transitions, D-002, D-048): distance and
 * duration of each trip in the mode the creator chose for it.
 */
import type { LatLng, Transport } from '@widoo/shared';
import {
  DirectionsUnavailable,
  profileOfMode,
  type DirectionsCache,
  type DirectionsLeg,
  type DirectionsProvider,
} from './directions';
import { roundedPoint, straightLineM } from './geo';

/** A step as the transitions see it. */
export interface TransitionStep {
  location: LatLng;
  /** Mode of the trip from this step to the next; null: the proposed one (`proposedMode`). */
  mode: Transport | null;
}

/** The trip from a step to the next. */
export interface Transition {
  distanceM: number;
  durationMin: number;
  mode: Transport;
  /** Straight-line estimate (`estimateOfMode`) in place of the provider, which did not answer. */
  estimated: boolean;
  /**
   * The route along the streets, as an encoded polyline (precision 5), for the map; only for a
   * trip computed by the provider, absent when estimated, for the metro and for no move at all.
   */
  geometry?: string;
}

/** How the transitions are computed: the provider, null when none is set up, and its cache. */
export interface TransitionTransport {
  directions: DirectionsProvider | null;
  cache: DirectionsCache | null;
}

/** Proposed mode up to this straight-line distance: on foot, then the metro (D-048). */
export const WALK_PROPOSAL_MAX_M = 1500;

/** How a trip is estimated from its straight line, in one mode. */
export interface ModeEstimate {
  /** The straight line times this coefficient: the distance travelled. */
  detour: number;
  /** Speed over that distance, in km/h. */
  speedKmH: number;
  /** Minutes added to the trip: getting to the station or the parking. */
  accessMin: number;
}

/**
 * Our estimate of a trip in each mode (Orchestration › Transitions, D-088): the only measures
 * stored, and those of the trips the provider did not answer. The metro is never asked of the
 * provider. The bike and car values are to be confirmed by the product.
 */
export const estimateOfMode: Record<Transport, ModeEstimate> = {
  walk: { detour: 1.3, speedKmH: 4.5, accessMin: 0 },
  metro: { detour: 1.4, speedKmH: 20, accessMin: 8 },
  bike: { detour: 1.3, speedKmH: 15, accessMin: 0 },
  car: { detour: 1.4, speedKmH: 20, accessMin: 8 },
};

/** The mode proposed for a trip of this straight-line distance (D-048). */
export function proposedMode(straightM: number): Transport {
  return straightM <= WALK_PROPOSAL_MAX_M ? 'walk' : 'metro';
}

/** Whole minutes, one at least for a trip that moves. */
const minutes = (value: number) => Math.max(1, Math.round(value));

/** The trip of this straight-line distance in this mode, by our estimate. */
function estimatedTrip(straightM: number, mode: Transport, estimated: boolean): Transition {
  const { detour, speedKmH, accessMin } = estimateOfMode[mode];
  const distanceM = straightM * detour;
  return {
    distanceM: Math.round(distanceM),
    durationMin: minutes((distanceM / (speedKmH * 1000)) * 60 + accessMin),
    mode,
    estimated,
  };
}

async function transitionBetween(
  from: LatLng,
  to: LatLng,
  chosen: Transport | null,
  transport: TransitionTransport,
): Promise<Transition> {
  const start = roundedPoint(from);
  const end = roundedPoint(to);
  const straightM = straightLineM(start, end);
  const mode = chosen ?? proposedMode(straightM);
  if (straightM === 0) {
    return { distanceM: 0, durationMin: 0, mode, estimated: false };
  }
  const profile = profileOfMode[mode];
  if (profile === null) {
    return estimatedTrip(straightM, mode, false);
  }
  const leg: DirectionsLeg = { from: start, to: end, profile };
  const directions = await routeOf(leg, transport);
  if (!directions) {
    return estimatedTrip(straightM, mode, true);
  }
  return {
    distanceM: Math.round(directions.distanceM),
    durationMin: minutes(directions.durationS / 60),
    mode,
    estimated: false,
    geometry: directions.geometry,
  };
}

/** The cached answer, else the provider's, cached; undefined when the provider is unavailable. */
async function routeOf(leg: DirectionsLeg, { directions, cache }: TransitionTransport) {
  const cached = await cache?.get(leg);
  if (cached) {
    return cached;
  }
  if (!directions) {
    return undefined;
  }
  try {
    const found = await directions.route(leg);
    await cache?.set(leg, found);
    return found;
  } catch (error) {
    if (error instanceof DirectionsUnavailable) {
      return undefined;
    }
    throw error;
  }
}

/**
 * The transition of each step to the next, in step order: one per step, null for the last one,
 * so that `steps[i].transition` is `result[i]`. The trips are computed side by side.
 */
export function computeTransitions(
  steps: readonly TransitionStep[],
  transport: TransitionTransport,
): Promise<(Transition | null)[]> {
  return Promise.all(
    steps.map((step, index) => {
      const next = steps[index + 1];
      return next ? transitionBetween(step.location, next.location, step.mode, transport) : null;
    }),
  );
}
