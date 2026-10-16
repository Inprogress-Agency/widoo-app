import {
  CatalogPlaceInput,
  placeImportOutcomes,
  type PlaceImportBody,
  type PlaceImportOutcome,
  type PlaceImportResult,
  type PlaceImportRowResult,
} from '@widoo/shared';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { createCatalogPlace, findCityId } from './place-writes';

/** Two places of the same name closer than this are the same place (wiki Admin-Web › A-04). */
const duplicateWithinM = 50;

type Accepted = { line: number; place: CatalogPlaceInput };

const sameName = (first: string, second: string) =>
  first.trim().toLocaleLowerCase('fr') === second.trim().toLocaleLowerCase('fr');

/** Distance in meters between two positions, on a sphere: enough to compare with 50 m. */
function distanceM(first: CatalogPlaceInput['location'], second: CatalogPlaceInput['location']) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(second.lat - first.lat);
  const dLng = radians(second.lng - first.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/** A place of the catalog with the same name within 50 m, if there is one. */
async function findDuplicateInCatalog(db: Db, place: CatalogPlaceInput) {
  const [found] = await db.execute<{ id: string; name: string }>(sql`
    select id, name from places
    where lower(name) = lower(${place.name})
      and ST_DWithin(location,
        ST_SetSRID(ST_MakePoint(${place.location.lng}, ${place.location.lat}), 4326)::geography,
        ${duplicateWithinM})
    limit 1`);
  return found;
}

/** The fields of a row the schema refuses, each named once, in the order of the sheet. */
function refusedFields(issues: readonly { path: PropertyKey[] }[]): string[] {
  return [...new Set(issues.map((issue) => String(issue.path[0] ?? 'place')))];
}

/**
 * Imports places from the rows of a file (A-04), or previews the import with `dryRun`. Every
 * row is judged on its own, in the order of the file: an invalid row, a duplicate or a place
 * outside every city is reported and skipped, the others are created (or `ready` in a preview).
 * Each created place has its own line in the journal of the admin.
 */
export async function importPlaces(
  db: Db,
  body: PlaceImportBody,
  actorId: string,
): Promise<PlaceImportResult> {
  const accepted: Accepted[] = [];
  const rows: PlaceImportRowResult[] = [];
  const report = (
    line: number,
    outcome: PlaceImportOutcome,
    details: Partial<Pick<PlaceImportRowResult, 'fields' | 'duplicateOf'>> = {},
  ) => rows.push({ line, outcome, fields: [], duplicateOf: null, ...details });

  for (const row of body.rows) {
    const parsed = CatalogPlaceInput.safeParse(row.place);
    if (!parsed.success) {
      report(row.line, 'invalid', { fields: refusedFields(parsed.error.issues) });
      continue;
    }
    const place = parsed.data;
    const earlier = accepted.find(
      (other) =>
        sameName(other.place.name, place.name) &&
        distanceM(other.place.location, place.location) < duplicateWithinM,
    );
    if (earlier) {
      const duplicateOf = { name: earlier.place.name, placeId: null, line: earlier.line };
      report(row.line, 'duplicate', { duplicateOf });
      continue;
    }
    const existing = await findDuplicateInCatalog(db, place);
    if (existing) {
      const duplicateOf = { name: existing.name, placeId: existing.id, line: null };
      report(row.line, 'duplicate', { duplicateOf });
      continue;
    }
    if (!(await findCityId(db, place.location))) {
      report(row.line, 'outside');
      continue;
    }
    accepted.push({ line: row.line, place });
    if (!body.dryRun) {
      await createCatalogPlace(db, place, actorId, 'place.import');
    }
    report(row.line, body.dryRun ? 'ready' : 'created');
  }

  const counts = Object.fromEntries(
    placeImportOutcomes.map((outcome) => [
      outcome,
      rows.filter((row) => row.outcome === outcome).length,
    ]),
  ) as PlaceImportResult['counts'];
  return { rows, counts };
}
