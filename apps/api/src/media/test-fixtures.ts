/**
 * Test data of the photo routes. Shared database, parallel files: the places and photos made
 * here are deleted by `cleanUp`.
 */
import { inArray } from 'drizzle-orm';
import type { buildApp } from '../app';
import { media, places } from '../db/schema';

type App = Awaited<ReturnType<typeof buildApp>>;
type Headers = Record<string, string>;

export function mediaFixtures(app: () => App) {
  const placeIds: string[] = [];
  const mediaIds: string[] = [];

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

  return { createPlace, track, cleanUp };
}
