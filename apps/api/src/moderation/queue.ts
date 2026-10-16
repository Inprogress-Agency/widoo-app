import {
  adminLateAfterHours,
  moderationQueuePageSize,
  moderationQueueStatuses,
  type ModerationQueue,
  type ModerationQueueItem,
  type ModerationQueueQuery,
  type ModerationQueueSort,
  type ModerationQueueStatus,
} from '@widoo/shared';
import { sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client';

type QueueRow = {
  id: string;
  title: string;
  status: ModerationQueueStatus;
  author_id: string | null;
  is_revision: boolean;
  author_first_name: string | null;
  author_is_certified: boolean;
  city_name: string;
  step_count: number;
  duration_min: number | null;
  warning_count: number;
  unverified_place_count: number;
  waiting_since: Date;
};

const statusList = sql.join(
  moderationQueueStatuses.map((status) => sql`${status}`),
  sql`, `,
);

// Until a route records its submission (`moderation_actions`, with the creation of a route), its
// last change stands for the moment it entered the queue.
const waitingSince = sql`r.updated_at`;

// A revision is the new version of a route already published. Revisions do not exist yet
// (`route_revisions`, with the creation of a route): no route of the queue is one. The filter,
// the count and the rows all read this one expression, the only thing to change then.
const isRevision = sql`false`;

// « Créateur certifié » (D-023) is computed from the routes and the ratings of an author, or set
// by the team: neither exists yet, so no author is certified. One expression, as for revisions.
const isCertifiedAuthor = sql`false`;

const sortExpressions: Record<ModerationQueueSort, SQL> = {
  waiting: waitingSince,
  title: sql`lower(r.title)`,
  author: sql`lower(coalesce(u.first_name, ''))`,
  city: sql`lower(c.name)`,
  warnings: sql`jsonb_array_length(coalesce(r.computed -> 'warnings', '[]'::jsonb))`,
};

const lateBefore = (now: Date) =>
  new Date(now.getTime() - adminLateAfterHours * 60 * 60 * 1000).toISOString();

/** `%` and `_` typed in the search are searched as they are, not read as wildcards. */
const likePattern = (text: string) => `%${text.replaceAll(/[\\%_]/g, '\\$&')}%`;

function filtersOf(query: ModerationQueueQuery, now: Date): SQL {
  const filters: SQL[] = [sql`r.status in (${statusList})`];
  if (query.status) {
    filters.push(sql`r.status = ${query.status}`);
  }
  if (query.city) {
    filters.push(sql`r.city_id = ${query.city}`);
  }
  if (query.late) {
    // Only a route waiting for its first look is late: one sent back to its author is not.
    filters.push(sql`r.status = 'pending'`);
    filters.push(sql`${waitingSince} < ${lateBefore(now)}::timestamptz`);
  }
  if (query.revision) {
    filters.push(isRevision);
  }
  if (query.q) {
    const pattern = likePattern(query.q);
    filters.push(sql`(r.title ilike ${pattern} or u.first_name ilike ${pattern})`);
  }
  return sql.join(filters, sql` and `);
}

const queueFrom = sql`from routes r
  join cities c on c.id = r.city_id
  left join users u on u.id = r.author_id and u.deleted_at is null`;

/**
 * The cursor of a page is the number of rows before it, kept opaque for the client. The queue is
 * short and sorted by several columns: an offset is enough, and a row decided meanwhile only
 * shifts the next page by one.
 */
const encodeCursor = (offset: number) => Buffer.from(String(offset)).toString('base64url');

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  const offset = Number(Buffer.from(cursor, 'base64url').toString());
  return Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
}

const toItem = (row: QueueRow): ModerationQueueItem => ({
  id: row.id,
  title: row.title,
  status: row.status,
  isRevision: row.is_revision,
  author: row.author_id
    ? {
        id: row.author_id,
        firstName: row.author_first_name,
        isCertified: row.author_is_certified,
      }
    : null,
  cityName: row.city_name,
  stepCount: row.step_count,
  durationMin: row.duration_min,
  warningCount: row.warning_count,
  unverifiedPlaceCount: row.unverified_place_count,
  waitingSince: new Date(row.waiting_since).toISOString(),
});

/** A page of the moderation queue (A-02), with the size of each filter over the whole queue. */
export async function readModerationQueue(
  db: Db,
  query: ModerationQueueQuery,
  now = new Date(),
): Promise<ModerationQueue> {
  const offset = decodeCursor(query.cursor);
  const where = filtersOf(query, now);
  const direction = query.direction === 'desc' ? sql`desc` : sql`asc`;

  const rows = await db.execute<QueueRow>(sql`
    select r.id, r.title, r.status, ${isRevision} as is_revision, u.id as author_id,
      ${isCertifiedAuthor} as author_is_certified, u.first_name as author_first_name,
      c.name as city_name,
      (select count(*)::int from steps s where s.route_id = r.id) as step_count,
      (r.computed ->> 'duration_min')::int as duration_min,
      ${sortExpressions.warnings} as warning_count,
      (select count(distinct p.id)::int from steps s join places p on p.id = s.place_id
        where s.route_id = r.id and p.verification_status <> 'verified') as unverified_place_count,
      ${waitingSince} as waiting_since
    ${queueFrom}
    where ${where}
    order by ${sortExpressions[query.sort]} ${direction}, r.id
    limit ${moderationQueuePageSize} offset ${offset}`);

  const [totals] = await db.execute<{
    total: number;
    pending: number;
    changes_requested: number;
    late: number;
    revisions: number;
  }>(sql`
    select
      (select count(*)::int ${queueFrom} where ${where}) as total,
      count(*) filter (where r.status = 'pending')::int as pending,
      count(*) filter (where r.status = 'changes_requested')::int as changes_requested,
      count(*) filter (
        where r.status = 'pending' and ${waitingSince} < ${lateBefore(now)}::timestamptz
      )::int as late,
      count(*) filter (where ${isRevision})::int as revisions
    from routes r
    where r.status in (${statusList})`);

  const cities = await db.execute<{ id: string; name: string }>(sql`
    select distinct c.id, c.name from routes r join cities c on c.id = r.city_id
    where r.status in (${statusList})
    order by c.name`);

  const total = totals?.total ?? 0;
  return {
    items: rows.map(toItem),
    total,
    counts: {
      pending: totals?.pending ?? 0,
      changesRequested: totals?.changes_requested ?? 0,
      late: totals?.late ?? 0,
      revisions: totals?.revisions ?? 0,
    },
    cities: cities.map(({ id, name }) => ({ id, name })),
    offset,
    previousCursor: offset > 0 ? encodeCursor(Math.max(0, offset - moderationQueuePageSize)) : null,
    nextCursor:
      offset + moderationQueuePageSize < total
        ? encodeCursor(offset + moderationQueuePageSize)
        : null,
  };
}
