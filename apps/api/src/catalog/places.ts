import {
  catalogPageSize,
  type CatalogPlace,
  type CatalogPlaceDetail,
  type CatalogPlaces,
  type CatalogPlaceSort,
  type CatalogPlacesQuery,
} from '@widoo/shared';
import { sql, type SQL } from 'drizzle-orm';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import type { Db } from '../db/client';

type PlaceRow = {
  id: string;
  name: string;
  category: CatalogPlace['category'];
  city_name: string;
  verification_status: CatalogPlace['verificationStatus'];
  verified_at: Date | null;
  route_count: number;
};

type DetailRow = PlaceRow & {
  address: string;
  lat: number;
  lng: number;
  is_indoor: boolean;
  price_range: CatalogPlaceDetail['priceRange'];
  website_url: string | null;
  phone: string | null;
  partner_booking_url: string | null;
  partner_program_id: string | null;
};

type HoursRow = {
  weekday: number;
  opens: string;
  closes: string;
  valid_from: string | null;
  valid_to: string | null;
};

const routeCount = sql`(select count(distinct s.route_id)::int from steps s where s.place_id = p.id)`;

const sortExpressions: Record<CatalogPlaceSort, SQL> = {
  name: sql`lower(p.name)`,
  category: sql`p.category`,
  city: sql`lower(c.name)`,
  verified: sql`p.verified_at`,
  routes: routeCount,
};

const columns = sql`p.id, p.name, p.category, c.name as city_name, p.verification_status,
  p.verified_at, ${routeCount} as route_count`;
const from = sql`from places p join cities c on c.id = p.city_id`;

/** `%` and `_` typed in the search are searched as they are, not read as wildcards. */
const likePattern = (text: string) => `%${text.replaceAll(/[\\%_]/g, '\\$&')}%`;

function filtersOf(query: CatalogPlacesQuery): SQL {
  const filters: SQL[] = [sql`true`];
  if (query.category) {
    filters.push(sql`p.category = ${query.category}`);
  }
  if (query.status) {
    filters.push(sql`p.verification_status = ${query.status}`);
  }
  if (query.q) {
    const pattern = likePattern(query.q);
    filters.push(sql`(p.name ilike ${pattern} or p.address ilike ${pattern})`);
  }
  return sql.join(filters, sql` and `);
}

const toPlace = (row: PlaceRow): CatalogPlace => ({
  id: row.id,
  name: row.name,
  category: row.category,
  cityName: row.city_name,
  verificationStatus: row.verification_status,
  verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
  routeCount: row.route_count,
});

/** `HH:MM` of a time the database returns with its seconds. */
const hourAndMinute = (time: string) => time.slice(0, 5);

/** A page of the places of the catalog (A-04). */
export async function readCatalogPlaces(db: Db, query: CatalogPlacesQuery): Promise<CatalogPlaces> {
  const offset = offsetOfCursor(query.cursor);
  const where = filtersOf(query);
  const direction = query.direction === 'desc' ? sql`desc` : sql`asc`;

  const rows = await db.execute<PlaceRow>(sql`
    select ${columns} ${from}
    where ${where}
    order by ${sortExpressions[query.sort]} ${direction} nulls last, p.id
    limit ${catalogPageSize} offset ${offset}`);
  const [counted] = await db.execute<{ total: number }>(
    sql`select count(*)::int as total ${from} where ${where}`,
  );
  const total = counted?.total ?? 0;
  return {
    items: rows.map(toPlace),
    total,
    offset,
    ...neighbourCursors(offset, total, catalogPageSize),
  };
}

/** The sheet of a place, its opening hours and the routes that go through it. */
export async function readCatalogPlace(
  db: Db,
  placeId: string,
): Promise<CatalogPlaceDetail | undefined> {
  const [place] = await db.execute<DetailRow>(sql`
    select ${columns}, p.address, p.is_indoor, p.price_range, p.website_url, p.phone,
      p.partner_booking_url, p.partner_program_id,
      ST_Y(p.location::geometry) as lat, ST_X(p.location::geometry) as lng
    ${from}
    where p.id = ${placeId}`);
  if (!place) {
    return undefined;
  }
  const hours = await db.execute<HoursRow>(sql`
    select weekday, opens::text, closes::text, valid_from::text, valid_to::text
    from place_hours where place_id = ${placeId}
    order by weekday, opens`);
  const routes = await db.execute<CatalogPlaceDetail['routes'][number]>(sql`
    select distinct r.id, r.title, r.status
    from steps s join routes r on r.id = s.route_id
    where s.place_id = ${placeId}
    order by r.title`);

  return {
    ...toPlace(place),
    address: place.address,
    location: { lat: place.lat, lng: place.lng },
    isIndoor: place.is_indoor,
    priceRange: place.price_range,
    websiteUrl: place.website_url,
    phone: place.phone,
    partnerBookingUrl: place.partner_booking_url,
    partnerProgramId: place.partner_program_id,
    hours: hours.map((slot) => ({
      weekday: slot.weekday,
      opens: hourAndMinute(slot.opens),
      closes: hourAndMinute(slot.closes),
      validFrom: slot.valid_from,
      validTo: slot.valid_to,
    })),
    routes: routes.map(({ id, title, status }) => ({ id, title, status })),
  };
}
