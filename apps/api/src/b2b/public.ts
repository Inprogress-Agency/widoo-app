import type { PublicPartner } from '@widoo/shared';
import { eq, sql } from 'drizzle-orm';
import { routeViewerOf } from '../access/route-viewer';
import type { Db } from '../db/client';
import { b2bClients } from '../db/schema';
import { cardColumns, cardJoins, toCard, type CardRow } from '../search/repository';

/**
 * The page of a partner for the site (`GET /public/partners/:slug`, ticket #347): its name and
 * the published routes it chose, in order, as cards for an anonymous visitor. `undefined`, so a
 * 404, for an unknown partner and for one that is suspended or ended. Nothing of its contact,
 * price or notes leaves the admin.
 */
export async function readPublicPartner(
  db: Db,
  slug: string,
  now = new Date(),
): Promise<PublicPartner | undefined> {
  const [client] = await db.select().from(b2bClients).where(eq(b2bClients.slug, slug));
  if (!client || (client.status !== 'prospect' && client.status !== 'active')) {
    return undefined;
  }
  const rows = await db.execute<CardRow>(sql`
    select r.id, ${cardColumns}
    from b2b_client_routes cr
    join routes r on r.id = cr.route_id
    ${cardJoins}
    where cr.client_id = ${client.id} and r.status = 'published'
    order by cr.position
  `);
  const viewer = await routeViewerOf(db, null, rows);
  return {
    slug: client.slug,
    name: client.name,
    isActive: client.status === 'active',
    routes: rows.map((row) => toCard(row, viewer, now)),
  };
}
