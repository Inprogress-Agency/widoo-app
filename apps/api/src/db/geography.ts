import { LatLng } from '@widoo/shared';
import { customType } from 'drizzle-orm/pg-core';

/** Axis-aligned envelope in degrees, in the order of `GET /routes/search?bbox=west,south,east,north`. */
export type BBox = { west: number; south: number; east: number; north: number };

/** WGS 84: longitude and latitude in degrees, the only reference system stored. */
const SRID = 4326;
const WKB_POINT = 1;
const WKB_POLYGON = 3;
const EWKB_HAS_SRID = 0x20000000;

/**
 * Positions `[x, y]` of a geography as PostGIS returns it (hex EWKB): the point, or the outer
 * ring of a polygon. Rejects any other shape rather than guessing.
 */
export function readEwkb(hex: string): [number, number][] {
  const bytes = Buffer.from(hex, 'hex');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const littleEndian = view.getUint8(offset) === 1;
  offset += 1;
  const type = view.getUint32(offset, littleEndian);
  offset += 4;
  if (type & EWKB_HAS_SRID) offset += 4;
  const uint32 = () => {
    offset += 4;
    return view.getUint32(offset - 4, littleEndian);
  };
  const position = (): [number, number] => {
    offset += 16;
    return [view.getFloat64(offset - 16, littleEndian), view.getFloat64(offset - 8, littleEndian)];
  };

  switch (type & 0xffff) {
    case WKB_POINT:
      return [position()];
    case WKB_POLYGON: {
      if (uint32() === 0) return [];
      return Array.from({ length: uint32() }, position);
    }
    default:
      throw new Error(`Unsupported geography type ${type & 0xffff}`);
  }
}

/** Smallest envelope around the points, e.g. the steps of a route. */
export function envelopeOf(points: readonly LatLng[]): BBox {
  if (points.length === 0) throw new Error('No point to envelope');
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return {
    west: Math.min(...lngs),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    north: Math.max(...lats),
  };
}

/** Parameters are EWKT strings, sent as bound values: never concatenated into SQL. */
const ewkt = (wkt: string) => `SRID=${SRID};${wkt}`;

/** `geography(Point,4326)`, read and written as `{ lat, lng }`. */
export const geographyPoint = customType<{ data: LatLng; driverData: string }>({
  dataType: () => `geography(Point,${SRID})`,
  toDriver: (value) => {
    const { lat, lng } = LatLng.parse(value);
    return ewkt(`POINT(${lng} ${lat})`);
  },
  fromDriver: (hex) => {
    const [point] = readEwkb(hex);
    if (!point) throw new Error('Empty geography point');
    return { lng: point[0], lat: point[1] };
  },
});

/**
 * `geography(Polygon,4326)` holding an envelope (`cities.bounds`, `routes.bounds`), read and
 * written as a `BBox`. At city scale, geodesic edges and parallels coincide.
 */
export const geographyBBox = customType<{ data: BBox; driverData: string }>({
  dataType: () => `geography(Polygon,${SRID})`,
  toDriver: (value) => {
    const sw = LatLng.parse({ lat: value.south, lng: value.west });
    const ne = LatLng.parse({ lat: value.north, lng: value.east });
    const ring = [
      [sw.lng, sw.lat],
      [ne.lng, sw.lat],
      [ne.lng, ne.lat],
      [sw.lng, ne.lat],
      [sw.lng, sw.lat],
    ];
    return ewkt(`POLYGON((${ring.map(([x, y]) => `${x} ${y}`).join(', ')}))`);
  },
  fromDriver: (hex) => envelopeOf(readEwkb(hex).map(([lng, lat]) => ({ lat, lng }))),
});
