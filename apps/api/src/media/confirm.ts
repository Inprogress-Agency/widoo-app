/**
 * `POST /media/:id/confirm` (#47): the original becomes three public widths without metadata and
 * a `media` row, after the last photo of its owner; the original is then deleted.
 */
import { photoUploadMaxBytes, uploadOwnerTypes, type StoredPhoto } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client';
import { media } from '../db/schema';
import { bodyValidationError, httpError } from '../errors';
import type { PlaceEditor } from '../places/update';
import { lockPhotoOwner, nextPhotoPosition } from './owners';
import { photoOf } from './photos';
import { InvalidPhoto, processPhoto } from './process';
import { UploadTooLarge, type PhotoStorage } from './storage';
import { assertUploadRoom, lockSender, uploadObjectName } from './upload';
import { variantObjectName, type PhotoUrls } from './urls';

/** `media.storage_path` of a photo the API stored: its widths lie under it (`media/urls.ts`). */
export const storedPhotoPath = (mediaId: string) => `photos/${mediaId}`;

/** The owner an original was signed for, as its metadata keeps it. */
const SignedOwner = z.object({ 'owner-type': z.enum(uploadOwnerTypes), 'owner-id': z.uuid() });

/** A row of `media` as the editor reads it, at its full width. */
function storedPhotoOf(row: typeof media.$inferSelect, photoUrls: PhotoUrls): StoredPhoto {
  const photo = photoOf(row, photoUrls);
  if (!photo) throw new Error(`Photo ${row.id} has no URL: MEDIA_PUBLIC_BASE_URL is missing`);
  const { id, ownerType, ownerId, position, width, height } = row;
  return { ...photo, id, ownerType, ownerId, position, width, height };
}

/** Deletes the original and refuses the file (422): not a photo the API decodes, or too large. */
async function refuseUpload(
  storage: PhotoStorage,
  objectName: string,
  error: unknown,
): Promise<never> {
  if (!(error instanceof InvalidPhoto || error instanceof UploadTooLarge)) throw error;
  await storage.deleteUpload(objectName);
  throw bodyValidationError([
    { path: '', code: 'invalid_photo', message: new InvalidPhoto().message },
  ]);
}

/**
 * The original `user` sent for `mediaId`, refused unless it is a photo (422, the original
 * deleted), else encoded again in three public widths, then its row, rights, room and quota
 * checked again; refused at that point, its widths are deleted. The same confirmation again
 * answers the same photo, `created` false. Storage that fails to delete is logged with the id of
 * the photo alone: the lifecycle rule, or the cleaning of #465, takes over.
 */
export async function confirmUpload(
  db: Db,
  storage: PhotoStorage,
  photoUrls: PhotoUrls,
  user: PlaceEditor,
  mediaId: string,
  { now, log }: { now: Date; log: FastifyBaseLogger },
): Promise<{ photo: StoredPhoto; created: boolean }> {
  const [stored] = await db.select().from(media).where(eq(media.id, mediaId));
  if (stored) {
    if (stored.uploadedBy !== user.id) throw httpError(404, 'Upload not found');
    return { photo: storedPhotoOf(stored, photoUrls), created: false };
  }
  const objectName = uploadObjectName(user.id, mediaId);
  const upload = await storage
    .readUpload(objectName, photoUploadMaxBytes)
    .catch((error: unknown) => refuseUpload(storage, objectName, error));
  const owner = upload && SignedOwner.safeParse(upload.metadata).data;
  if (!upload || !owner) throw httpError(404, 'Upload not found');
  const processed = await processPhoto(upload.data).catch((error: unknown) =>
    refuseUpload(storage, objectName, error),
  );

  const storagePath = storedPhotoPath(mediaId);
  const variants = processed.variants.map(({ width, data }) => ({
    name: variantObjectName(storagePath, width),
    data,
  }));
  await Promise.all(variants.map(({ name, data }) => storage.writePhoto(name, data)));
  let confirmed: { row: typeof media.$inferSelect; created: boolean };
  try {
    confirmed = await db.transaction(async (tx) => {
      await lockSender(tx, user.id);
      const [won] = await tx.select().from(media).where(eq(media.id, mediaId));
      if (won) return { row: won, created: false };
      await assertUploadRoom(tx, user.id, now);
      await lockPhotoOwner(tx, user, owner['owner-type'], owner['owner-id']);
      const position = await nextPhotoPosition(tx, owner['owner-type'], owner['owner-id']);
      const [row] = await tx
        .insert(media)
        .values({
          id: mediaId,
          ownerType: owner['owner-type'],
          ownerId: owner['owner-id'],
          storagePath,
          width: processed.width,
          height: processed.height,
          position,
          uploadedBy: user.id,
        })
        .returning();
      if (!row) throw new Error(`Photo ${mediaId} not inserted`);
      return { row, created: true };
    });
  } catch (error) {
    // Refused at the last moment (rights, room, quota): nothing of it stays public.
    await storage
      .deletePhotos(variants.map(({ name }) => name))
      .catch((cleanup: unknown) => log.warn({ err: cleanup, mediaId }, 'photo widths left'));
    throw error;
  }
  await storage
    .deleteUpload(objectName)
    .catch((cleanup: unknown) => log.warn({ err: cleanup, mediaId }, 'photo original left'));
  return { photo: storedPhotoOf(confirmed.row, photoUrls), created: confirmed.created };
}
