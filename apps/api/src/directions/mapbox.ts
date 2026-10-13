/**
 * Directions of the transitions from Mapbox (Orchestration › Transitions), called by the API alone
 * with its server token, one trip a request: the profile of the mode, the full route as an
 * encoded polyline, no alternative and no turn-by-turn steps.
 */
import {
  DirectionsUnavailable,
  type Directions,
  type DirectionsLeg,
  type DirectionsProvider,
} from '@widoo/orchestration';
import { z } from 'zod';

const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

/** The orchestration waits 4 s at most for a trip, then falls back to a straight line. */
const UPSTREAM_TIMEOUT_MS = 4000;

/** What the orchestration reads of an answer; anything else is ignored. */
const Answer = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        distance: z.number().nonnegative(),
        duration: z.number().nonnegative(),
        geometry: z.string().min(1),
      }),
    )
    .optional(),
});

/** Why a trip was not computed, as it may be logged: never its URL, which holds the token. */
export type DirectionsFailure = {
  profile: DirectionsLeg['profile'];
  status: number | 'timeout' | 'network' | 'invalid' | 'no_route';
};

export interface MapboxDirectionsOptions {
  token: string;
  fetch?: typeof fetch;
  onFailure?: (failure: DirectionsFailure) => void;
}

/** `lng,lat` with the 5 decimals of a rounded point, never in exponent notation. */
const pointOf = ({ lat, lng }: DirectionsLeg['from']) => `${lng.toFixed(5)},${lat.toFixed(5)}`;

/** The provider of the orchestration; every failure throws `DirectionsUnavailable`. */
export function createMapboxDirections(options: MapboxDirectionsOptions): DirectionsProvider {
  const fetchFn = options.fetch ?? fetch;
  const fail = (profile: DirectionsLeg['profile'], status: DirectionsFailure['status']) => {
    options.onFailure?.({ profile, status });
    return new DirectionsUnavailable();
  };

  return {
    async route({ from, to, profile }): Promise<Directions> {
      const query = new URLSearchParams({
        alternatives: 'false',
        geometries: 'polyline',
        overview: 'full',
        steps: 'false',
        access_token: options.token,
      });
      const url = `${DIRECTIONS_URL}/${profile}/${pointOf(from)};${pointOf(to)}?${query.toString()}`;
      let response: Response;
      try {
        response = await fetchFn(url, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'TimeoutError';
        throw fail(profile, isTimeout ? 'timeout' : 'network');
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw fail(profile, response.ok ? 'invalid' : response.status);
      }
      const answer = Answer.safeParse(body);
      // Mapbox says NoRoute or NoSegment with a 200 or a 4xx: no route between the points.
      if (answer.success && /^No(Route|Segment)$/.test(answer.data.code)) {
        throw fail(profile, 'no_route');
      }
      if (!response.ok) {
        throw fail(profile, response.status);
      }
      const route = answer.success && answer.data.code === 'Ok' ? answer.data.routes?.[0] : null;
      if (!route) {
        throw fail(profile, 'invalid');
      }
      return { distanceM: route.distance, durationS: route.duration, geometry: route.geometry };
    },
  };
}
