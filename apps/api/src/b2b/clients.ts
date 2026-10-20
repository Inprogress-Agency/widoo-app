import {
  b2bSourceOf,
  type B2bClient,
  type B2bClientInput,
  type B2bClientListItem,
  type B2bClients,
} from '@widoo/shared';
import { asc, DrizzleQueryError, eq, sql } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import type { Db, Tx } from '../db/client';
import { b2bClientRoutes, b2bClients, routes } from '../db/schema';
import { httpError } from '../errors';

type ClientRow = typeof b2bClients.$inferSelect;

const slugTaken = () =>
  httpError(409, 'A partner already has this slug', 'conflict', { reason: 'slug_taken' });

const isSlugViolation = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  (error.cause as { constraint_name?: string } | undefined)?.constraint_name ===
    'b2b_clients_slug_unique';

const listItemOf = (
  row: ClientRow,
  routeCount: number,
  cityNames: string[],
): B2bClientListItem => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  type: row.type,
  status: row.status,
  monthlyPriceCents: row.monthlyPriceCents,
  startedAt: row.startedAt,
  cityNames,
  routeCount,
});

type Counts = { route_count: number; city_names: string[] | null };

/** The number of routes of a partner and the cities they start in, by partner. */
async function countsOf(db: Db | Tx, clientId?: string): Promise<Map<string, Counts>> {
  const rows = await db.execute<Counts & { id: string }>(sql`
    select c.id,
      (select count(*)::int from b2b_client_routes cr where cr.client_id = c.id) as route_count,
      (select array_agg(distinct ci.name order by ci.name)
        from b2b_client_routes cr
        join routes r on r.id = cr.route_id
        join cities ci on ci.id = r.city_id
        where cr.client_id = c.id) as city_names
    from b2b_clients c
    ${clientId ? sql`where c.id = ${clientId}` : sql``}`);
  return new Map(rows.map((row) => [row.id, row]));
}

/** The partners, the active ones first then by name, each with the cities of its routes. */
export async function readClients(db: Db): Promise<B2bClients> {
  const [counts, clients] = await Promise.all([countsOf(db), db.select().from(b2bClients)]);
  return {
    items: clients
      .sort(
        (a, b) =>
          Number(b.status === 'active') - Number(a.status === 'active') ||
          a.name.localeCompare(b.name, 'fr'),
      )
      .map((client) =>
        listItemOf(
          client,
          counts.get(client.id)?.route_count ?? 0,
          counts.get(client.id)?.city_names ?? [],
        ),
      ),
  };
}

/** The card of a partner, or null when it does not exist. */
export async function readClient(db: Db | Tx, id: string): Promise<B2bClient | null> {
  const [row] = await db.select().from(b2bClients).where(eq(b2bClients.id, id));
  if (!row) {
    return null;
  }
  const [counts, chosen] = await Promise.all([
    countsOf(db, id),
    db
      .select({
        id: routes.id,
        title: routes.title,
        status: routes.status,
        position: b2bClientRoutes.position,
      })
      .from(b2bClientRoutes)
      .innerJoin(routes, eq(routes.id, b2bClientRoutes.routeId))
      .where(eq(b2bClientRoutes.clientId, id))
      .orderBy(asc(b2bClientRoutes.position)),
  ]);
  return {
    ...listItemOf(row, counts.get(id)?.route_count ?? 0, counts.get(id)?.city_names ?? []),
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    address: row.address,
    notes: row.notes,
    source: b2bSourceOf(row.slug),
    routes: chosen.map((route) => ({
      id: route.id,
      title: route.title,
      position: route.position,
      isPublished: route.status === 'published',
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

async function cardOf(tx: Tx, id: string): Promise<B2bClient> {
  const card = await readClient(tx, id);
  if (!card) {
    throw httpError(404, 'Partner not found');
  }
  return card;
}

/** Registers a partner (A-10), with its journal line. 409 `slug_taken` for a slug already used. */
export async function createClient(
  db: Db,
  actorId: string,
  input: B2bClientInput,
): Promise<B2bClient> {
  try {
    return await db.transaction(async (tx) => {
      const [taken] = await tx
        .select({ id: b2bClients.id })
        .from(b2bClients)
        .where(eq(b2bClients.slug, input.slug));
      if (taken) {
        throw slugTaken();
      }
      const [row] = await tx.insert(b2bClients).values(input).returning();
      if (!row) {
        throw new Error('Partner not created');
      }
      await recordAdminAction(tx, {
        actorId,
        action: 'b2b_client.create',
        targetType: 'b2b_client',
        targetId: row.id,
        after: input,
      });
      return cardOf(tx, row.id);
    });
  } catch (error) {
    // Two partners created at once with the same slug: the unique constraint answers the second.
    throw isSlugViolation(error) ? slugTaken() : error;
  }
}
