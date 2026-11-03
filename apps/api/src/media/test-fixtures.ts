/**
 * Test data of the photo routes: the in-memory storage, and the `PUT` of the app played on it.
 * Shared database, parallel files: the places and photos made here are deleted by `cleanUp`.
 */
import { PhotoUploadTicket, type PhotoUploadRequest } from '@widoo/shared';
import { inArray } from 'drizzle-orm';
import type { buildApp } from '../app';
import { media, places } from '../db/schema';
import { jpegWithMetadata } from './test-photos';
import { MemoryPhotoStorage } from './test-storage';

type App = Awaited<ReturnType<typeof buildApp>>;
type Headers = Record<string, string>;

/** Public URL of the bucket of the processed photos in the tests. */
export const testPhotoBase = 'https://storage.googleapis.com/widoo-test-media';

export function mediaFixtures(app: () => App) {
  const storage = new MemoryPhotoStorage();
  const placeIds: string[] = [];
  const mediaIds: string[] = [];

  const askUploadUrl = (headers: Headers, body: object) =>
    app().inject({ method: 'POST', url: '/v1/media/upload-url', headers, payload: body });

  const confirm = (headers: Headers, mediaId: string) =>
    app().inject({ method: 'POST', url: `/v1/media/${mediaId}/confirm`, headers });

  /** Asks a URL for a JPEG of the owner and sends `file` on it as the app would. */
  async function upload(
    headers: Headers,
    owner: Pick<PhotoUploadRequest, 'ownerType' | 'ownerId'>,
    file?: Buffer,
  ) {
    const asked = await askUploadUrl(headers, { ...owner, contentType: 'image/jpeg' });
    if (asked.statusCode !== 200) throw new Error(`No upload URL: ${asked.body}`);
    const ticket = PhotoUploadTicket.parse(asked.json());
    const sent = storage.put(
      ticket.uploadUrl,
      ticket.headers,
      file ?? (await jpegWithMetadata(800, 600)),
    );
    if (sent !== 200) throw new Error(`The storage refused the PUT: ${sent}`);
    mediaIds.push(ticket.mediaId);
    return ticket;
  }

  /** `upload`, then the confirmation of the app. */
  async function sendPhoto(
    headers: Headers,
    owner: Pick<PhotoUploadRequest, 'ownerType' | 'ownerId'>,
    file?: Buffer,
  ) {
    const ticket = await upload(headers, owner, file);
    return { ticket, confirmed: await confirm(headers, ticket.mediaId) };
  }

  /** A place of the signed-in account, far from the demo, as E-13 creates it. */
  async function createPlace(headers: Headers, name: string) {
    const created = await app().inject({
      method: 'POST',
      url: '/v1/places',
      headers,
      payload: {
        name,
        category: 'cafe',
        location: { lat: 48.83 + placeIds.length * 0.0015, lng: 2.27 },
        address: 'Adresse fictive, 75015 Paris',
        force: true,
      },
    });
    const { id } = created.json<{ id: string }>();
    placeIds.push(id);
    return id;
  }

  /** Rows of `media` written by a test itself, deleted by `cleanUp`. */
  const track = (ids: string[]) => mediaIds.push(...ids);

  async function cleanUp() {
    if (mediaIds.length > 0) await app().db.delete(media).where(inArray(media.id, mediaIds));
    if (placeIds.length > 0) {
      await app().db.delete(media).where(inArray(media.ownerId, placeIds));
      await app().db.delete(places).where(inArray(places.id, placeIds));
    }
  }

  return { storage, askUploadUrl, confirm, upload, sendPhoto, createPlace, track, cleanUp };
}
