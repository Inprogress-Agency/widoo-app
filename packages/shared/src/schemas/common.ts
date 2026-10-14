import { z } from 'zod';

export const Latitude = z.number().min(-90).max(90);
export const Longitude = z.number().min(-180).max(180);

/** Coordinates as the API exchanges them. */
export const LatLng = z.object({ lat: Latitude, lng: Longitude });
export type LatLng = z.infer<typeof LatLng>;

/** Media and booking links: https only (wiki Securite-et-RGPD). */
export const HttpsUrl = z.url({ protocol: /^https$/ });

/** Text without markup nor control characters (wiki Securite-et-RGPD). */
const plainTextPattern = /^[^<>\p{Cc}]*$/u;
const plainTextMessage = 'Plain text only, without < > or control characters';

/**
 * Free text typed by a user, displayed to others: trimmed, without markup or control characters
 * (wiki Securite-et-RGPD), and bounded unless the specification sets no length.
 */
export const plainText = (maxLength?: number) => {
  const text = z.string().trim().min(1);
  return (maxLength === undefined ? text : text.max(maxLength)).regex(
    plainTextPattern,
    plainTextMessage,
  );
};
