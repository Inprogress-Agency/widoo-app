/**
 * Where a photo comes from (`media.source`, D-050): sent by its author, or a free photo of
 * Wikimedia Commons, whose credit (author, licence, source page) is shown wherever it appears.
 * Technical only: the credit is the visible part, never the key.
 */
export const mediaSources = ['upload', 'commons'] as const;
export type MediaSource = (typeof mediaSources)[number];

/**
 * What a photo belongs to (`media.owner_type`, wiki Modele-de-Donnees › media): a route (6 at
 * most, D-050), a place, a step (5 at most, D-029), a revision until it is validated (D-115), or
 * an account, its profile photo (D-119).
 */
export const mediaOwnerTypes = ['route', 'place', 'step', 'revision', 'user'] as const;
export type MediaOwnerType = (typeof mediaOwnerTypes)[number];

/**
 * Owners a photo can be sent for (`POST /media/upload-url`, #47). The photos of a revision
 * (#434) and the profile photo (#426) join with the tickets that carry their rules.
 */
export const uploadOwnerTypes = ['route', 'step', 'place'] as const;
export type UploadOwnerType = (typeof uploadOwnerTypes)[number];

/** Photos of a route, the cover first (D-050). */
export const routePhotosMax = 6;

/** Image types a photo is sent in: what the app compresses to, and what the API decodes. */
export const photoContentTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoContentType = (typeof photoContentTypes)[number];

/** Size of a photo sent, at most, enforced by the signed URL (wiki Securite-et-RGPD, 10 Mo). */
export const photoUploadMaxBytes = 10 * 1024 * 1024;

/** Photos an account sends a day, at most (wiki Securite-et-RGPD › Limitation de débit). */
export const photoUploadDailyLimit = 50;
