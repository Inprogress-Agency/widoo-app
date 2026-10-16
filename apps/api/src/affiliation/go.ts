import { resolveBookingLink, type BookingLink } from '@widoo/shared';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { bookingClicks } from '../db/schema';

type StepLinkRow = {
  booking_url: string | null;
  booking_is_affiliate: boolean;
  partner_booking_url: string | null;
  program_is_active: boolean | null;
};

/**
 * The link « Réserver » opens for a step of a published route, with the rule of
 * `resolveBookingLink` (creator first). Null for an unknown step, a route that is not online, a
 * step without a link, or a link that is not https: nothing is ever redirected to anything else.
 */
export async function bookingLinkOfStep(db: Db, stepId: string): Promise<BookingLink | null> {
  const [row] = await db.execute<StepLinkRow>(sql`
    select s.booking_url, s.booking_is_affiliate, p.partner_booking_url,
      ap.is_active as program_is_active
    from steps s
    join routes r on r.id = s.route_id
    join places p on p.id = s.place_id
    left join affiliate_programs ap on ap.id = p.partner_program_id
    where s.id = ${stepId} and r.status = 'published'`);
  if (!row) {
    return null;
  }
  const link = resolveBookingLink(
    { bookingUrl: row.booking_url, bookingIsAffiliate: row.booking_is_affiliate },
    { partnerBookingUrl: row.partner_booking_url, partnerProgramIsActive: row.program_is_active },
  );
  return link && link.url.startsWith('https://') ? link : null;
}

/**
 * Counts a click on « Réserver » and answers the link to open (A-09), or null when the step has
 * none. The click is written before the answer, so the one that is counted is the one that is
 * served. No account is recorded: the redirect opens in the browser, without a session.
 */
export async function countBookingClick(db: Db, stepId: string): Promise<BookingLink | null> {
  const link = await bookingLinkOfStep(db, stepId);
  if (link) {
    await db.insert(bookingClicks).values({ stepId, linkOrigin: link.origin });
  }
  return link;
}
