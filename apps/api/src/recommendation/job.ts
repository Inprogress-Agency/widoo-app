/**
 * Nightly recomputation of the stable components (`POST /internal/recommendation`): every
 * published route, or the given ones, in batches, with the mean of every rated route as prior.
 */
import { taxonomies } from '@widoo/shared';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client';
import { ratingOf } from '../db/route-stats';
import { defaultPriorMean } from './components';
import { stableRecommendationOf } from './stable';

const batchSize = 500;

const InputRow = z.object({
  id: z.uuid(),
  is_official: z.boolean(),
  stats: z.unknown(),
  published_ms: z.number().nullable(),
  computed_at: z.string().nullable(),
  statuses: z.array(z.enum(taxonomies.verificationStatuses)).nullable(),
  first_category: z.enum(taxonomies.placeCategories).nullable(),
});

const dateOrNull = (value: string | null) => {
  const time = value === null ? Number.NaN : Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
};

/** Mean rating of the published routes, each weighted by its number of ratings. */
async function priorMeanOf(db: Db): Promise<number> {
  const [row] = await db.execute<{ mean: number | null }>(sql`
    select (sum((stats->>'rating_avg')::float8 * (stats->>'rating_count')::int)
      / nullif(sum((stats->>'rating_count')::int), 0))::float8 as mean
    from routes
    where status = 'published'
      and jsonb_typeof(stats->'rating_avg') = 'number'
      and (stats->>'rating_count')::int > 0
  `);
  const mean = row?.mean;
  return typeof mean === 'number' && mean >= 1 && mean <= 5 ? mean : defaultPriorMean;
}

export async function recomputeRecommendations(
  db: Db,
  options: { now: Date; routeIds?: readonly string[] },
): Promise<{ updated: number }> {
  if (options.routeIds?.length === 0) return { updated: 0 };
  const priorMean = await priorMeanOf(db);
  const scope = options.routeIds
    ? sql`and r.id in (${sql.join(
        options.routeIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`
    : sql``;
  const rows = await db.execute(sql`
    select r.id, r.is_official, r.stats, r.computed->>'computed_at' as computed_at,
      (extract(epoch from r.published_at) * 1000)::float8 as published_ms,
      (select json_agg(p.verification_status order by s.position)
        from steps s join places p on p.id = s.place_id where s.route_id = r.id) as statuses,
      (select p.category from steps s join places p on p.id = s.place_id
        where s.route_id = r.id order by s.position limit 1) as first_category
    from routes r
    where r.status = 'published' ${scope}
  `);
  const updates = rows.map((raw) => {
    const row = InputRow.parse(raw);
    return {
      id: row.id,
      recommendation: stableRecommendationOf(
        {
          isOfficial: row.is_official,
          rating: ratingOf(row.stats),
          publishedAt: row.published_ms === null ? null : new Date(row.published_ms),
          computedAt: dateOrNull(row.computed_at),
          placeStatuses: row.statuses ?? [],
          firstCategory: row.first_category,
        },
        { now: options.now, priorMean },
      ),
    };
  });
  for (let start = 0; start < updates.length; start += batchSize) {
    const batch = updates.slice(start, start + batchSize);
    // A derived column: `updated_at` stays the date of the last edit of the route.
    await db.execute(sql`
      update routes r set recommendation = x.recommendation
      from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) as x(id uuid, recommendation jsonb)
      where r.id = x.id
    `);
  }
  return { updated: updates.length };
}
