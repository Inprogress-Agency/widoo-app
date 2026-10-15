/**
 * Access of a route (Orchestration › Accès, D-050): the station nearest the first step, its lines
 * and the distance walked to it, estimated like a walking trip (D-088): straight line × detour.
 * Stored in `routes.computed.access`; null when no station is within a walk.
 */
import { estimateOfMode, straightLineM, WALK_PROPOSAL_MAX_M } from '@widoo/orchestration';
import type { LatLng } from '@widoo/shared';
import { transitDataset, type TransitLine, type TransitStation } from './stations';

export interface StationAccess {
  /** Name of the stop nearest the start: `Abbesses`. */
  station: string;
  /** Every line of the station, metro first: « Métro Abbesses, ligne 12 ». */
  lines: TransitLine[];
  /** Walked, estimated: « à 50 m du départ ». */
  distanceM: number;
}

/** Beyond it, the start is not « near » a station: the walk a trip would propose (1.5 km). */
export const ACCESS_MAX_M = WALK_PROPOSAL_MAX_M;

/** The station nearest the point, among the reference stations by default. */
export function nearestAccess(
  location: LatLng,
  stations: readonly TransitStation[] = transitDataset.stations,
): StationAccess | null {
  let nearest: { station: TransitStation; name: string; straightM: number } | null = null;
  for (const station of stations) {
    for (const stop of station.stops) {
      const straightM = straightLineM(location, stop);
      if (!nearest || straightM < nearest.straightM)
        nearest = { station, name: stop.name, straightM };
    }
  }
  if (!nearest) return null;
  const distanceM = Math.round(nearest.straightM * estimateOfMode.walk.detour);
  if (distanceM > ACCESS_MAX_M) return null;
  return { station: nearest.name, lines: nearest.station.lines, distanceM };
}

/** `routes.computed.access`: snake_case like the rest of `computed`. */
export type AccessColumn = { station: string; lines: TransitLine[]; distance_m: number } | null;

/** The access of a start as `computed` stores it; null without a start or a station near it. */
export function accessColumnOf(start: LatLng | null | undefined): AccessColumn {
  const access = start ? nearestAccess(start) : null;
  return access && { station: access.station, lines: access.lines, distance_m: access.distanceM };
}
