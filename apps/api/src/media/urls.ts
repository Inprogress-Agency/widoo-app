/**
 * The URL a photo is served at (#530). `media.storage_path` holds either the https URL of an
 * external photo, served as it is (the Unsplash photos of the demo dataset), or the path of a
 * photo stored in the bucket of the processed photos: one JPEG per width, `<path>/<width>.jpg`,
 * served under the public URL of that bucket (`MEDIA_PUBLIC_BASE_URL`). That URL is stable, with
 * neither signature nor expiry: the snapshot of a planned route may freeze it for E-07 offline.
 */

/** Widths of the variants of a stored photo, in pixels, its longest side at most. */
export const photoWidths = [400, 800, 1600] as const;
export type PhotoWidth = (typeof photoWidths)[number];

/** Width of the cover of a card (E-01, E-04), shown about 350 points wide. */
export const cardCoverWidth: PhotoWidth = 800;
/** Width of every other photo served: galleries, « En images », exports, moderation. */
export const fullPhotoWidth: PhotoWidth = 1600;

/** Object of one variant of a stored photo, in the bucket of the processed photos. */
export const variantObjectName = (storagePath: string, width: PhotoWidth) =>
  `${storagePath}/${width}.jpg`;

/**
 * Path of a stored photo, as the API writes it (`photos/<id>`): lowercase letters, digits and
 * hyphens, in segments. Anything else (`..`, a dot, a query, another scheme) is never made a URL.
 */
const storedPathPattern = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/;

/**
 * The URL of a photo at a width; null when it cannot be served: stored by path while this
 * environment has no public URL for its photos, or neither an https URL nor a stored path.
 */
export type PhotoUrls = (storagePath: string, width: PhotoWidth) => string | null;

export function photoUrlsFrom(publicBaseUrl: string | undefined): PhotoUrls {
  return (storagePath, width) => {
    if (storagePath.startsWith('https://')) return storagePath;
    if (!publicBaseUrl || !storedPathPattern.test(storagePath)) return null;
    return `${publicBaseUrl}/${variantObjectName(storagePath, width)}`;
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Photo URLs of this environment, under `MEDIA_PUBLIC_BASE_URL`. */
    photoUrls: PhotoUrls;
  }
}
