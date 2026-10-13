/**
 * What the orchestration asks of a directions provider and of its cache: interfaces only, which
 * the API implements (Mapbox Directions, Postgres), so that the module runs without network,
 * database or framework.
 */
import type { LatLng, Transport } from '@widoo/shared';

/** Profiles of Mapbox Directions that the orchestration uses. */
export const directionsProfiles = ['walking', 'cycling', 'driving'] as const;
export type DirectionsProfile = (typeof directionsProfiles)[number];

/**
 * Profile asked for each mode of a trip; null for the metro, estimated by a coefficient at the
 * MVP, public transport being out of it (Orchestration › Transitions).
 */
export const profileOfMode: Record<Transport, DirectionsProfile | null> = {
  walk: 'walking',
  bike: 'cycling',
  car: 'driving',
  metro: null,
};

/** One trip asked of the provider, its points rounded (`roundedPoint`). */
export interface DirectionsLeg {
  from: LatLng;
  to: LatLng;
  profile: DirectionsProfile;
}

/** The answer of the provider for a leg. */
export interface Directions {
  distanceM: number;
  durationS: number;
  /** The route along the streets, as an encoded polyline (precision 5). */
  geometry: string;
}

/** Computes a leg; throws `DirectionsUnavailable` when it cannot answer. */
export interface DirectionsProvider {
  route: (leg: DirectionsLeg) => Promise<Directions>;
}

/** The provider did not answer, or found no route: the trip falls back to a straight line. */
export class DirectionsUnavailable extends Error {
  constructor() {
    super('Directions unavailable');
    this.name = 'DirectionsUnavailable';
  }
}

/** Answers of the provider kept for a while, by leg; how long is the implementation's choice. */
export interface DirectionsCache {
  get: (leg: DirectionsLeg) => Promise<Directions | undefined>;
  set: (leg: DirectionsLeg, directions: Directions) => Promise<void>;
}
