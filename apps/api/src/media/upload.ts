/**
 * Photos sent by the app (#47, wiki API › Création): the signed URL that sends an original into
 * the private upload bucket. Nothing is written in the base before the confirmation
 * (`confirm.ts`): an upload never confirmed has no row, and the lifecycle rule of the upload
 * bucket deletes its original after a day.
 */
import {
  photoUploadDailyLimit,
  photoUploadMaxBytes,
  type PhotoUploadRequest,
  type PhotoUploadTicket,
} from '@widoo/shared';
import { and, count, eq, gt } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import { media, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { photoUploadLimitReached } from '../errors';
import type { PlaceEditor } from '../places/update';
import { lockPhotoOwner, nextPhotoPosition } from './owners';
import type { PhotoStorage } from './storage';

/** Time the app has to send the file once it has the URL. */
const uploadLifetimeMs = 15 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

/** Object of an original in the upload bucket, under its sender: no one else can confirm it. */
export const uploadObjectName = (userId: string, mediaId: string) => `uploads/${userId}/${mediaId}`;

/**
 * Locks the account: its confirmations run one after the other, so that two of them cannot both
 * take the last photo of the day, nor both store the same upload.
 */
export async function lockSender(tx: Tx, userId: string) {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('no key update');
}

/**
 * 429 once the account kept the photos of a day (wiki Securite-et-RGPD › Limitation de débit),
 * counted in the base like the other daily limits (risk accepted by D-115).
 */
export async function assertUploadRoom(tx: Tx, userId: string, now: Date) {
  const [sent] = await tx
    .select({ count: count() })
    .from(media)
    .where(and(eq(media.uploadedBy, userId), gt(media.createdAt, new Date(now.getTime() - dayMs))));
  if ((sent?.count ?? 0) >= photoUploadDailyLimit) {
    throw photoUploadLimitReached(photoUploadDailyLimit);
  }
}

/**
 * `POST /media/upload-url`: the right of `user` to add a photo to the owner, the room it has left
 * and the quota of the day, then a URL to send the original once, within 15 minutes, its type,
 * size and owner signed with it.
 */
export async function issueUpload(
  db: Db,
  storage: PhotoStorage,
  user: PlaceEditor,
  request: PhotoUploadRequest,
  now: Date,
): Promise<PhotoUploadTicket> {
  await db.transaction(async (tx) => {
    await assertUploadRoom(tx, user.id, now);
    await lockPhotoOwner(tx, user, request.ownerType, request.ownerId);
    await nextPhotoPosition(tx, request.ownerType, request.ownerId);
  });
  const mediaId = uuidv7(now.getTime());
  const expiresAt = new Date(now.getTime() + uploadLifetimeMs);
  const { url, headers } = await storage.signUpload({
    objectName: uploadObjectName(user.id, mediaId),
    contentType: request.contentType,
    maxBytes: photoUploadMaxBytes,
    metadata: { 'owner-type': request.ownerType, 'owner-id': request.ownerId },
    expiresAt,
  });
  return { mediaId, method: 'PUT', uploadUrl: url, headers, expiresAt: expiresAt.toISOString() };
}
