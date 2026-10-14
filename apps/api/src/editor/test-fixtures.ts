import type { OwnRoute, UserRole } from '@widoo/shared';
import { inArray } from 'drizzle-orm';
import type { buildApp } from '../app';
import type { TestTokenVerifier } from '../auth/test-verifier';
import { media, routes, users } from '../db/schema';
import { seed, seedId } from '../db/seed';

type App = Awaited<ReturnType<typeof buildApp>>;

/** Places of the demo, in the Marais, a few minutes apart on foot. */
export const demoPlaceIds = ['maison-victor-hugo', 'musee-carnavalet', 'musee-cognacq-jay'].map(
  (key) => seedId(`place:${key}`),
);

/** A description long enough to publish (80 characters at least), fictitious. */
export const publishableDescription =
  'Trois musées du Marais en une matinée, à pied, entre hôtels particuliers et cours pavées.';

/**
 * Test data of the editor tests: shared database, parallel files. Every account made here and
 * every route of these accounts is deleted by `cleanUp`, with the photos added to them.
 */
export function editorFixtures(app: () => App, verifier: TestTokenVerifier) {
  const uids: string[] = [];
  const mediaOwnerIds: string[] = [];

  /** A signed-in account of the given role; the seed is run first, for the demo places. */
  async function signIn(role: UserRole = 'user') {
    await seed(app().db);
    const { token, uid } = verifier.issue();
    uids.push(uid);
    await app().db.insert(users).values({ firebaseUid: uid, role });
    return { authorization: `Bearer ${token}` };
  }

  /** A photo for each owner: the route itself, or steps (`media.owner_type`). */
  async function addPhotos(ownerType: 'route' | 'step', ownerIds: string[]) {
    mediaOwnerIds.push(...ownerIds);
    await app()
      .db.insert(media)
      .values(
        ownerIds.map((ownerId) => ({
          ownerType,
          ownerId,
          storagePath: `test/${ownerType}/${ownerId}.jpg`,
          width: 1200,
          height: 800,
        })),
      );
  }

  /**
   * A route of the signed-in account that breaks no blocking rule: titled, described, three
   * steps of the demo, a photo on the route and on each step. Still a draft.
   */
  async function publishableDraft(headers: Record<string, string>): Promise<OwnRoute> {
    const created = await app().inject({
      method: 'POST',
      url: '/v1/routes',
      headers,
      payload: { title: 'Les musées du Marais' },
    });
    const { id } = created.json<OwnRoute>();
    await app().inject({
      method: 'PATCH',
      url: `/v1/routes/${id}`,
      headers,
      payload: { description: publishableDescription, moods: ['culture'] },
    });
    const put = await app().inject({
      method: 'PUT',
      url: `/v1/routes/${id}/steps`,
      headers,
      payload: { steps: demoPlaceIds.map((placeId) => ({ placeId, durationMin: 45 })) },
    });
    const route = put.json<OwnRoute>();
    await addPhotos('route', [id]);
    await addPhotos(
      'step',
      route.steps.map((step) => step.id),
    );
    return route;
  }

  async function cleanUp() {
    if (mediaOwnerIds.length > 0) {
      await app().db.delete(media).where(inArray(media.ownerId, mediaOwnerIds));
    }
    if (uids.length === 0) return;
    const authors = await app()
      .db.select({ id: users.id })
      .from(users)
      .where(inArray(users.firebaseUid, uids));
    const authorIds = authors.map((author) => author.id);
    if (authorIds.length > 0) {
      await app().db.delete(routes).where(inArray(routes.authorId, authorIds));
    }
    await app().db.delete(users).where(inArray(users.firebaseUid, uids));
  }

  return { signIn, addPhotos, publishableDraft, cleanUp };
}
