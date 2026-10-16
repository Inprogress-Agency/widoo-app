import type {
  AffiliateProgram,
  AffiliateProgramInput,
  AffiliateProgramPatch,
  AffiliatePrograms,
} from '@widoo/shared';
import { eq, sql } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import type { Db, Tx } from '../db/client';
import { affiliatePrograms } from '../db/schema';
import { httpError } from '../errors';

const programOf = (
  row: typeof affiliatePrograms.$inferSelect,
  placeCount: number,
): AffiliateProgram => ({
  id: row.id,
  name: row.name,
  network: row.network,
  commissionNote: row.commissionNote,
  cookieDays: row.cookieDays,
  isActive: row.isActive,
  placeCount,
  createdAt: row.createdAt.toISOString(),
});

/** The programs, active first then by name, each with the places whose partner link names it. */
export async function readPrograms(db: Db): Promise<AffiliatePrograms> {
  const rows = await db.execute<{ id: string; place_count: number }>(
    sql`select ap.id, (select count(*)::int from places p where p.partner_program_id = ap.id) as place_count
        from affiliate_programs ap`,
  );
  const counts = new Map(rows.map((row) => [row.id, row.place_count]));
  const programs = await db.select().from(affiliatePrograms);
  return {
    items: programs
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'fr'))
      .map((program) => programOf(program, counts.get(program.id) ?? 0)),
  };
}

/** 409 when another program already has this name, whatever its case. */
async function assertNameFree(tx: Tx, name: string, exceptId?: string): Promise<void> {
  const [taken] = await tx
    .select({ id: affiliatePrograms.id })
    .from(affiliatePrograms)
    .where(sql`lower(${affiliatePrograms.name}) = lower(${name})`);
  if (taken && taken.id !== exceptId) {
    throw httpError(409, 'A program already has this name', 'conflict', { reason: 'name_taken' });
  }
}

/** Registers a program (A-09), with its journal line. */
export async function createProgram(
  db: Db,
  actorId: string,
  input: AffiliateProgramInput,
): Promise<AffiliateProgram> {
  return db.transaction(async (tx) => {
    await assertNameFree(tx, input.name);
    const [row] = await tx.insert(affiliatePrograms).values(input).returning();
    if (!row) {
      throw new Error('Program not created');
    }
    await recordAdminAction(tx, {
      actorId,
      action: 'affiliate_program.create',
      targetType: 'affiliate_program',
      targetId: row.id,
      after: input,
    });
    return programOf(row, 0);
  });
}

/** Changes the fields given of a program, with its journal line (before and after). 404 if unknown. */
export async function updateProgram(
  db: Db,
  actorId: string,
  id: string,
  patch: AffiliateProgramPatch,
  now = new Date(),
): Promise<AffiliateProgram> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(affiliatePrograms)
      .where(eq(affiliatePrograms.id, id))
      .for('update');
    if (!current) {
      throw httpError(404, 'Program not found');
    }
    if (patch.name !== undefined) {
      await assertNameFree(tx, patch.name, id);
    }
    const [row] = await tx
      .update(affiliatePrograms)
      .set({ ...patch, updatedAt: now })
      .where(eq(affiliatePrograms.id, id))
      .returning();
    if (!row) {
      throw httpError(404, 'Program not found');
    }
    const changed = Object.keys(patch) as (keyof AffiliateProgramPatch)[];
    await recordAdminAction(tx, {
      actorId,
      action: 'affiliate_program.update',
      targetType: 'affiliate_program',
      targetId: id,
      before: Object.fromEntries(changed.map((field) => [field, current[field]])),
      after: patch,
    });
    const [counted] = await tx.execute<{ place_count: number }>(
      sql`select count(*)::int as place_count from places where partner_program_id = ${id}`,
    );
    return programOf(row, counted?.place_count ?? 0);
  });
}
