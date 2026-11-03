/**
 * `POST /media/:id/confirm` (#47): the original becomes three public widths without metadata and
 * a `media` row, after the last photo of its owner; the original is then deleted. Rights, room
 * and quota are checked before the original is read, and again under lock before the row.
 */
import { photoUploadMaxBytes, uploadOwnerTypes, type StoredPhoto } from '@widoo/shared';
import { and, eq, lt } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';
import type { Db, Tx } from '../db/client';
import { media, photoUploads } from '../db/schema';
import { bodyValidationError, httpError } from '../errors';
import type { PlaceEditor } from '../places/update';
import { lockPhotoOwner, nextPhotoPosition } from './owners';
import { photoOf } from './photos';
import { InvalidPhoto, processPhoto } from './process';
import { inPhotoSlot } from './slot';
import type { PhotoStorage } from './storage';
import { assertUploadRoom, lockSender, uploadObjectName } from './upload';
import { variantObjectName, type PhotoUrls } from './urls';

/** Confirmations older than this serve nothing, the originals they name being long gone. */
const keptConfirmationsMs = 7 * 24 * 60 * 60 * 1000;

/** `media.storage_path` of a photo the API stored: its widths lie under it (`media/urls.ts`). */
export const storedPhotoPath = (mediaId: string) => `photos/${mediaId}`;

/** The owner an original was signed for, as its metadata keeps it. */
const SignedOwner = z.object({ 'owner-type': z.enum(uploadOwnerTypes), 'owner-id': z.uuid() });

type MediaRow = typeof media.$inferSelect;
type Confirmed = { photo: StoredPhoto; created: boolean };

const uploadNotFound = () => httpError(404, 'Upload not found');

/** A row of `media` as the editor reads it, at its full width. */
function storedPhotoOf(row: MediaRow, photoUrls: PhotoUrls): StoredPhoto {
  const photo = photoOf(row, photoUrls);
  if (!photo) throw new Error(`Photo ${row.id} has no URL: MEDIA_PUBLIC_BASE_URL is missing`);
  const { id, ownerType, ownerId, position, width, height } = row;
  return { ...photo, id, ownerType, ownerId, position, width, height };
}

/** Deletes the original and refuses the file (422): not a photo as the app sends it. */
async function refuseOriginal(storage: PhotoStorage, objectName: string): Promise<never> {
  await storage.deleteUpload(objectName);
  throw bodyValidationError([
    { path: '', code: 'invalid_photo', message: new InvalidPhoto().message },
  ]);
}

/**
 * The original `user` sent for `mediaId`, in this order:
 * - a photo already stored answers again (`created` false), a confirmation at the same moment
 *   included; a photo confirmed then deleted answers 404: a photo is confirmed once, never again
 *   from its original, nor from a new `PUT` on its URL;
 * - the head of the original: 404 without one, 422 over 10 MiB, the original deleted;
 * - rights on its owner, room and quota of the day, before the original is read or decoded;
 * - read and processed one at a time on the instance (`inPhotoSlot`): refused (422, the
 *   original deleted) unless it is a photo as the app sends it;
 * - its three widths written, then its row and its confirmation (`photo_uploads`), rights, room
 *   and quota checked again under lock; any failure there deletes the widths written.
 * The original is deleted last. Storage that fails to delete is logged with the id of the photo
 * alone: the lifecycle rule, or the cleaning of #465, takes over.
 */
export async function confirmUpload(
  db: Db,
  storage: PhotoStorage,
  photoUrls: PhotoUrls,
  user: PlaceEditor,
  mediaId: string,
  { now, log }: { now: Date; log: FastifyBaseLogger },
): Promise<Confirmed> {
  const storedIn = async (tx: Db | Tx): Promise<Confirmed | null> => {
    const [row] = await tx.select().from(media).where(eq(media.id, mediaId));
    if (!row) return null;
    if (row.uploadedBy !== user.id) throw uploadNotFound();
    return { photo: storedPhotoOf(row, photoUrls), created: false };
  };
  const stored = await storedIn(db);
  if (stored) return stored;

  const objectName = uploadObjectName(user.id, mediaId);
  const [confirmedBefore] = await db
    .select({ id: photoUploads.id })
    .from(photoUploads)
    .where(eq(photoUploads.id, mediaId));
  if (confirmedBefore) {
    const raced = await storedIn(db);
    if (raced) return raced;
    await storage.deleteUpload(objectName);
    throw uploadNotFound();
  }
  const head = await storage.statUpload(objectName);
  const owner = head && SignedOwner.safeParse(head.metadata).data;
  if (!head || !owner) throw uploadNotFound();
  if (head.size > photoUploadMaxBytes) await refuseOriginal(storage, objectName);
  const ownerType = owner['owner-type'];
  const ownerId = owner['owner-id'];
  const checked = await db.transaction(async (tx) => {
    const raced = await storedIn(tx);
    if (raced) return raced;
    await assertUploadRoom(tx, user.id, now);
    await lockPhotoOwner(tx, user, ownerType, ownerId);
    await nextPhotoPosition(tx, ownerType, ownerId);
    return null;
  });
  if (checked) return checked;

  const processed = await inPhotoSlot(async () => {
    const original = await storage.downloadUpload(objectName);
    if (!original) return null;
    return processPhoto(original).catch(() => refuseOriginal(storage, objectName));
  });
  if (!processed) {
    // Gone meanwhile: stored by a confirmation at the same moment, or never there.
    const raced = await storedIn(db);
    if (raced) return raced;
    throw uploadNotFound();
  }

  const storagePath = storedPhotoPath(mediaId);
  const widths = processed.variants.map(({ width, data }) => ({
    name: variantObjectName(storagePath, width),
    data,
  }));
  let confirmed: { row: MediaRow; created: boolean };
  try {
    // Every write settled before any is undone: none lands after the cleaning.
    const written = await Promise.allSettled(
      widths.map(({ name, data }) => storage.writePhoto(name, data)),
    );
    const failed = written.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
    confirmed = await db.transaction(async (tx) => {
      await lockSender(tx, user.id);
      const [won] = await tx.select().from(media).where(eq(media.id, mediaId));
      if (won) return { row: won, created: false };
      await assertUploadRoom(tx, user.id, now);
      await lockPhotoOwner(tx, user, ownerType, ownerId);
      const position = await nextPhotoPosition(tx, ownerType, ownerId);
      const [row] = await tx
        .insert(media)
        .values({
          id: mediaId,
          ownerType,
          ownerId,
          storagePath,
          width: processed.width,
          height: processed.height,
          position,
          uploadedBy: user.id,
        })
        .returning();
      if (!row) throw new Error(`Photo ${mediaId} not inserted`);
      await tx.insert(photoUploads).values({ id: mediaId, userId: user.id });
      await tx
        .delete(photoUploads)
        .where(
          and(
            eq(photoUploads.userId, user.id),
            lt(photoUploads.createdAt, new Date(now.getTime() - keptConfirmationsMs)),
          ),
        );
      return { row, created: true };
    });
  } catch (error) {
    // Refused at the last moment, or a width not written: nothing of it stays public.
    await storage
      .deletePhotos(widths.map(({ name }) => name))
      .catch((cleanup: unknown) => log.warn({ err: cleanup, mediaId }, 'photo widths left'));
    throw error;
  }
  await storage
    .deleteUpload(objectName)
    .catch((cleanup: unknown) => log.warn({ err: cleanup, mediaId }, 'photo original left'));
  return { photo: storedPhotoOf(confirmed.row, photoUrls), created: confirmed.created };
}
