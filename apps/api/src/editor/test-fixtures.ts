import type { UserRole } from '@widoo/shared';
import { inArray } from 'drizzle-orm';
import type { buildApp } from '../app';
import type { TestTokenVerifier } from '../auth/test-verifier';
import { routes, users } from '../db/schema';
import { seed } from '../db/seed';

type App = Awaited<ReturnType<typeof buildApp>>;

/**
 * Test data of the editor tests: shared database, parallel files. Every account made here and
 * every route of these accounts is deleted by `cleanUp`.
 */
export function editorFixtures(app: () => App, verifier: TestTokenVerifier) {
  const uids: string[] = [];

  /** A signed-in account of the given role; the seed is run first, for the demo places. */
  async function signIn(role: UserRole = 'user') {
    await seed(app().db);
    const { token, uid } = verifier.issue();
    uids.push(uid);
    await app().db.insert(users).values({ firebaseUid: uid, role });
    return { authorization: `Bearer ${token}` };
  }

  async function cleanUp() {
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

  return { signIn, cleanUp };
}
