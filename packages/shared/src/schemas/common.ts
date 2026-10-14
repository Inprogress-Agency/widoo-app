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

/** Line breaks and tabs: the only control characters a multiline text keeps. */
const multilineTextPattern = /^(?:[^<>\p{Cc}]|[\n\r\t])*$/u;

/**
 * Free text on several lines (a message to the support): `plainText`, line breaks and tabs
 * allowed.
 */
export const multilineText = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .regex(multilineTextPattern, 'Text only, without < > or control characters but line breaks');
