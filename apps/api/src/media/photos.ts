/**
 * Photos as the API serves them (wiki API › Découverte, D-052): their URL and, for a free photo
 * of Wikimedia Commons, its credit; null for a photo of its creator.
 */
import type { Photo } from '@widoo/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { media } from '../db/schema';
import { fullPhotoWidth, type PhotoUrls } from './urls';

type MediaRow = Pick<
  typeof media.$inferSelect,
  'storagePath' | 'source' | 'author' | 'license' | 'sourceUrl'
>;

/** The served photo of a row, at its full width; undefined when it cannot be served (`PhotoUrls`). */
export function photoOf(row: MediaRow, photoUrls: PhotoUrls): Photo | undefined {
  const url = photoUrls(row.storagePath, fullPhotoWidth);
  if (!url) return undefined;
  const { author, license, sourceUrl } = row;
  const isCredited = row.source === 'commons' && author && license && sourceUrl;
  return { url, credit: isCredited ? { author, license, sourceUrl } : null };
}

/** The photos of each owner of a type, in their order; an owner without any is absent. */
export async function photosByOwner(
  db: Db,
  photoUrls: PhotoUrls,
  ownerType: (typeof media.$inferSelect)['ownerType'],
  ownerIds: string[],
): Promise<Map<string, Photo[]>> {
  const byOwner = new Map<string, Photo[]>();
  if (ownerIds.length === 0) return byOwner;
  const rows = await db
    .select({
      ownerId: media.ownerId,
      storagePath: media.storagePath,
      source: media.source,
      author: media.author,
      license: media.license,
      sourceUrl: media.sourceUrl,
    })
    .from(media)
    .where(and(eq(media.ownerType, ownerType), inArray(media.ownerId, ownerIds)))
    .orderBy(asc(media.ownerId), asc(media.position));
  for (const { ownerId, ...row } of rows) {
    const photo = photoOf(row, photoUrls);
    if (photo) byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), photo]);
  }
  return byOwner;
}
