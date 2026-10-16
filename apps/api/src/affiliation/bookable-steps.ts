import {
  adminBookableStepsPageSize,
  resolveBookingLink,
  type BookableSteps,
  type BookableStepsQuery,
} from '@widoo/shared';
import { sql } from 'drizzle-orm';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import type { Db } from '../db/client';

type Row = {
  step_id: string;
  position: number;
  route_id: string;
  route_title: string;
  place_id: string;
  place_name: string;
  booking_url: string | null;
  booking_is_affiliate: boolean;
  partner_booking_url: string | null;
  program_is_active: boolean | null;
  clicks_30_days: number;
};

/**
 * What makes a step bookable: its creator asks for a booking, or it carries a link, or its place
 * has a partner link of Widoo. Only the steps of published routes count.
 */
const bookableSteps = sql`from steps s
  join routes r on r.id = s.route_id and r.status = 'published'
  join places p on p.id = s.place_id
  left join affiliate_programs ap on ap.id = p.partner_program_id
  where (s.booking_required or s.booking_url is not null or p.partner_booking_url is not null)`;

/**
 * A page of the bookable steps (A-09), the most clicked over the last 30 days first, with the link
 * each one shows and where it comes from. `withoutPartnerLink` keeps the places with no partner
 * link of Widoo: the ones to sign up for first.
 */
export async function readBookableSteps(
  db: Db,
  query: BookableStepsQuery,
  now = new Date(),
): Promise<BookableSteps> {
  const offset = offsetOfCursor(query.cursor);
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const where = query.withoutPartnerLink
    ? sql`${bookableSteps} and p.partner_booking_url is null`
    : bookableSteps;

  const rows = await db.execute<Row>(sql`
    select s.id as step_id, s.position, r.id as route_id, r.title as route_title,
      p.id as place_id, p.name as place_name, s.booking_url, s.booking_is_affiliate,
      p.partner_booking_url, ap.is_active as program_is_active,
      (select count(*)::int from booking_clicks c
        where c.step_id = s.id and c.created_at >= ${since.toISOString()}::timestamptz) as clicks_30_days
    ${where}
    order by clicks_30_days desc, r.title, s.position, s.id
    limit ${adminBookableStepsPageSize} offset ${offset}`);
  const [counted] = await db.execute<{ total: number }>(
    sql`select count(*)::int as total ${where}`,
  );
  const total = counted?.total ?? 0;
  return {
    items: rows.map((row) => ({
      stepId: row.step_id,
      position: row.position,
      route: { id: row.route_id, title: row.route_title },
      place: {
        id: row.place_id,
        name: row.place_name,
        hasPartnerLink: row.partner_booking_url !== null,
      },
      link: resolveBookingLink(
        { bookingUrl: row.booking_url, bookingIsAffiliate: row.booking_is_affiliate },
        {
          partnerBookingUrl: row.partner_booking_url,
          partnerProgramIsActive: row.program_is_active,
        },
      ),
      clicks30Days: row.clicks_30_days,
    })),
    total,
    offset,
    ...neighbourCursors(offset, total, adminBookableStepsPageSize),
  };
}
