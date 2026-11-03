import { z } from 'zod';
import { mediaOwnerTypes, photoContentTypes, uploadOwnerTypes } from '../media';
import { HttpsUrl } from './common';
import { Photo } from './route';

/** Body of `POST /media/upload-url` (#47): the photo to come, what it belongs to, its type. */
export const PhotoUploadRequest = z.strictObject({
  ownerType: z.enum(uploadOwnerTypes),
  ownerId: z.uuid(),
  contentType: z.enum(photoContentTypes),
});
export type PhotoUploadRequest = z.infer<typeof PhotoUploadRequest>;

/**
 * Answer of `POST /media/upload-url`: the app sends the file once, by `PUT` on `uploadUrl` with
 * exactly `headers`, before `expiresAt`. Its type, its size range and its owner are part of the
 * signature: storage refuses any other. Then it confirms it, `POST /media/:mediaId/confirm`.
 */
export const PhotoUploadTicket = z.object({
  mediaId: z.uuid(),
  method: z.literal('PUT'),
  uploadUrl: HttpsUrl,
  headers: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
});
export type PhotoUploadTicket = z.infer<typeof PhotoUploadTicket>;

/**
 * A photo once confirmed (`POST /media/:id/confirm`), served like any photo at its full width,
 * with its id, owner and rank among the photos of its owner: what the editor shows or deletes.
 */
export const StoredPhoto = Photo.extend({
  id: z.uuid(),
  ownerType: z.enum(mediaOwnerTypes),
  ownerId: z.uuid(),
  position: z.int().nonnegative(),
  width: z.int().positive(),
  height: z.int().positive(),
});
export type StoredPhoto = z.infer<typeof StoredPhoto>;
