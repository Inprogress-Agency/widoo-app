/**
 * `DELETE /media/:id` (#47, wiki Modele-de-Donnees › media): a photo loses its row in the
 * transaction, then its objects in storage unless another row still holds them.
 */
import { uploadOwnerTypes } from '@widoo/shared';
import { and, asc, eq, gt } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import type { Db } from '../db/client';
import { media } from '../db/schema';
import { httpError } from '../errors';
import type { PlaceEditor } from '../places/update';
import { lockPhotoOwner } from './owners';
import type { PhotoStorage } from './storage';
import { photoWidths, variantObjectName } from './urls';

/**
 * A photo of an owner `user` may change: its row deleted and the photos after it moved up one
 * rank, the cover passing to the next photo; then its widths in the public bucket, unless
 * another row shares them. A failure of the storage is logged with the id of the photo alone:
 * the photo is gone from the API, its objects wait for the cleaning of #465.
 */
export async function deletePhoto(
  db: Db,
  storage: PhotoStorage,
  user: PlaceEditor,
  mediaId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const freedPath = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(media).where(eq(media.id, mediaId));
    const ownerType = uploadOwnerTypes.find((type) => type === row?.ownerType);
    if (!row || !ownerType) throw httpError(404, 'Photo not found');
    await lockPhotoOwner(tx, user, ownerType, row.ownerId);
    const [deleted] = await tx.delete(media).where(eq(media.id, mediaId)).returning();
    if (!deleted) throw httpError(404, 'Photo not found');
    const after = await tx
      .select({ id: media.id, position: media.position })
      .from(media)
      .where(
        and(
          eq(media.ownerType, ownerType),
          eq(media.ownerId, row.ownerId),
          gt(media.position, row.position),
        ),
      )
      .orderBy(asc(media.position));
    // One at a time, upwards: each rank is free when a photo takes it (a step: 0 to 4, once each).
    for (const photo of after) {
      await tx
        .update(media)
        .set({ position: photo.position - 1 })
        .where(eq(media.id, photo.id));
    }
    const [shared] = await tx
      .select({ id: media.id })
      .from(media)
      .where(eq(media.storagePath, row.storagePath))
      .limit(1);
    return shared || row.storagePath.startsWith('https://') ? null : row.storagePath;
  });
  if (!freedPath) return;
  await storage
    .deletePhotos(photoWidths.map((width) => variantObjectName(freedPath, width)))
    .catch((error: unknown) => log.warn({ err: error, mediaId }, 'photo widths left'));
}
