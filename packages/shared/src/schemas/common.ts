import { z } from 'zod';

export const Latitude = z.number().min(-90).max(90);
export const Longitude = z.number().min(-180).max(180);

/** Coordinates as the API exchanges them. */
export const LatLng = z.object({ lat: Latitude, lng: Longitude });
export type LatLng = z.infer<typeof LatLng>;

/** Media and booking links: https only (wiki Securite-et-RGPD). */
export const HttpsUrl = z.url({ protocol: /^https$/ });

/**
 * Free text typed by a user, displayed to others: trimmed, bounded, without markup or control
 * characters (wiki Securite-et-RGPD).
 */
export const plainText = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .regex(/^[^<>\p{Cc}]*$/u, 'Plain text only, without < > or control characters');
