import type { Bbox, LngLat } from '../map/geo';

const isInRange = (value: number, limit: number) =>
  Number.isFinite(value) && value >= -limit && value <= limit;

/** Below a millionth of a degree, about 10 cm: the centre of the map is 0,0. */
const nullIslandTolerance = 1e-6;

/**
 * A zone the search may be asked for: its corners within the world, west of east and south of
 * north, of some size, and not centred on 0,0, where the map stands before any camera is set
 * (Filtres-et-Recherche › Recherche par zone). Neither the search nor the count of the panel
 * ever goes out with another zone.
 */
export function isSearchableZone(bbox: Bbox | null | undefined): bbox is Bbox {
  if (!bbox) {
    return false;
  }
  const { west, south, east, north } = bbox;
  const isWithinWorld =
    isInRange(west, 180) && isInRange(east, 180) && isInRange(south, 90) && isInRange(north, 90);
  const isUninitialised =
    Math.abs(west + east) / 2 < nullIslandTolerance &&
    Math.abs(south + north) / 2 < nullIslandTolerance;
  return isWithinWorld && west < east && south < north && !isUninitialised;
}

/**
 * The view the map opens on: a searchable zone holding the centre its camera was put on. On
 * Android the map settles once with the longitude and the zoom of that camera but a latitude of
 * 0, just before the camera reaches it (rnmapbox/maps#4273): that zone is not the opening view.
 */
export function isOpeningZone(bbox: Bbox | null | undefined, [lng, lat]: LngLat): boolean {
  return (
    isSearchableZone(bbox) &&
    lng >= bbox.west &&
    lng <= bbox.east &&
    lat >= bbox.south &&
    lat <= bbox.north
  );
}
