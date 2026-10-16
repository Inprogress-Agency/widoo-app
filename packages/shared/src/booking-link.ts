/**
 * Where the booking link of a step comes from (D-048): the creator's own link, the creator's
 * affiliate link, or the link of a partner program of Widoo. Technical only: the admin names them.
 */
export const linkOrigins = ['creator', 'creator_affiliate', 'partner'] as const;
export type LinkOrigin = (typeof linkOrigins)[number];
