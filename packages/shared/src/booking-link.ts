/**
 * Where the booking link of a step comes from (D-048): the creator's own link, the creator's
 * affiliate link, or the link of a partner program of Widoo. Technical only: the admin names them.
 */
export const linkOrigins = ['creator', 'creator_affiliate', 'partner'] as const;
export type LinkOrigin = (typeof linkOrigins)[number];

/** The booking link a step shows, and where it comes from. */
export type BookingLink = { url: string; origin: LinkOrigin };

/**
 * The link « Réserver » opens (D-048, wiki Compte-et-Monetisation › Liens de réservation): the
 * creator's own link first, as their pay and what makes them create; the partner link of Widoo
 * only when the creator set none, and unless the program it belongs to is no longer active. Null
 * when the step has no link at all. `partnerProgramIsActive` is null for a partner link that names
 * no program. The one place of the rule: the route sheet and `GET /go/:stepId` both read it.
 */
export function resolveBookingLink(
  step: { bookingUrl: string | null; bookingIsAffiliate: boolean },
  place: { partnerBookingUrl: string | null; partnerProgramIsActive: boolean | null },
): BookingLink | null {
  if (step.bookingUrl !== null) {
    return {
      url: step.bookingUrl,
      origin: step.bookingIsAffiliate ? 'creator_affiliate' : 'creator',
    };
  }
  if (place.partnerBookingUrl !== null && place.partnerProgramIsActive !== false) {
    return { url: place.partnerBookingUrl, origin: 'partner' };
  }
  return null;
}
