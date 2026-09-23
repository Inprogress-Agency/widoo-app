import { z } from 'zod';

export const Latitude = z.number().min(-90).max(90);
export const Longitude = z.number().min(-180).max(180);

/** Coordinates as the API exchanges them. */
export const LatLng = z.object({ lat: Latitude, lng: Longitude });
export type LatLng = z.infer<typeof LatLng>;

/** Media and booking links: https only (wiki Securite-et-RGPD). */
export const HttpsUrl = z.url({ protocol: /^https$/ });
