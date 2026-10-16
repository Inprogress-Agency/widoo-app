import type { CatalogPlaceInput } from '@widoo/shared';
import { eq, sql } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import type { Db } from '../db/client';
import { affiliatePrograms, placeHours, places } from '../db/schema';
import { httpError } from '../errors';

type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/** The city a position belongs to: the one whose bounds hold it; undefined outside every city. */
export async function findCityId(
  db: Pick<Db, 'execute'>,
  location: CatalogPlaceInput['location'],
): Promise<string | undefined> {
  const [city] = await db.execute<{ id: string }>(sql`
    select id from cities
    where ST_Covers(bounds, ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography)
    limit 1`);
  return city?.id;
}

/**
 * The city of a place being written. A place outside every city is refused until cities are
 * created from the position itself (wiki Admin-Web › Villes).
 */
async function cityOf(tx: Transaction, location: CatalogPlaceInput['location']): Promise<string> {
  const cityId = await findCityId(tx, location);
  if (!cityId) {
    throw httpError(400, 'Position outside every city');
  }
  return cityId;
}

const fieldsOf = (input: CatalogPlaceInput) => ({
  name: input.name,
  category: input.category,
  address: input.address,
  location: input.location,
  isIndoor: input.isIndoor,
  priceRange: input.priceRange,
  websiteUrl: input.websiteUrl,
  phone: input.phone,
  // Left out, the partner link is left as it is (a creation or an import never sends it).
  ...(input.partnerBookingUrl === undefined
    ? {}
    : {
        partnerBookingUrl: input.partnerBookingUrl,
        partnerProgramId: input.partnerProgramId ?? null,
      }),
});

/** 400 when the program a partner link names does not exist. */
async function assertProgramExists(tx: Transaction, programId: string | null | undefined) {
  if (!programId) {
    return;
  }
  const [program] = await tx
    .select({ id: affiliatePrograms.id })
    .from(affiliatePrograms)
    .where(eq(affiliatePrograms.id, programId));
  if (!program) {
    throw httpError(400, 'Unknown affiliate program');
  }
}

async function replaceHours(tx: Transaction, placeId: string, hours: CatalogPlaceInput['hours']) {
  await tx.delete(placeHours).where(eq(placeHours.placeId, placeId));
  if (hours.length > 0) {
    await tx.insert(placeHours).values(hours.map((slot) => ({ ...slot, placeId })));
  }
}

/**
 * Creates a place by hand (A-04). The team says nothing of its verification: a place nobody
 * checked on the spot starts `stale`, to be verified.
 */
export async function createCatalogPlace(
  db: Db,
  input: CatalogPlaceInput,
  actorId: string,
  /** How the place came in, as the journal names it: by hand, or from an imported file. */
  action: 'place.create' | 'place.import' = 'place.create',
): Promise<string> {
  return db.transaction(async (tx) => {
    const cityId = await cityOf(tx, input.location);
    const [created] = await tx
      .insert(places)
      .values({ ...fieldsOf(input), cityId, verificationStatus: 'stale', createdBy: actorId })
      .returning({ id: places.id });
    if (!created) {
      throw new Error('Place not created');
    }
    await replaceHours(tx, created.id, input.hours);
    await recordAdminAction(tx, {
      actorId,
      action,
      targetType: 'place',
      targetId: created.id,
      after: input,
    });
    return created.id;
  });
}

/**
 * Replaces the sheet of a place and its opening hours (A-04), and keeps the sheet before and
 * after in the journal. False when the place does not exist.
 */
export async function updateCatalogPlace(
  db: Db,
  placeId: string,
  input: CatalogPlaceInput,
  actorId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(places).where(eq(places.id, placeId)).for('update');
    if (!before) {
      return false;
    }
    const hoursBefore = await tx.select().from(placeHours).where(eq(placeHours.placeId, placeId));
    const cityId = await cityOf(tx, input.location);
    await assertProgramExists(tx, input.partnerProgramId);
    await tx
      .update(places)
      .set({ ...fieldsOf(input), cityId })
      .where(eq(places.id, placeId));
    await replaceHours(tx, placeId, input.hours);
    await recordAdminAction(tx, {
      actorId,
      action: 'place.update',
      targetType: 'place',
      targetId: placeId,
      before: {
        name: before.name,
        category: before.category,
        address: before.address,
        location: before.location,
        isIndoor: before.isIndoor,
        priceRange: before.priceRange,
        websiteUrl: before.websiteUrl,
        phone: before.phone,
        partnerBookingUrl: before.partnerBookingUrl,
        partnerProgramId: before.partnerProgramId,
        hours: hoursBefore.map(({ weekday, opens, closes, validFrom, validTo }) => ({
          weekday,
          opens,
          closes,
          validFrom,
          validTo,
        })),
      },
      after: input,
    });
    return true;
  });
}
