import { FirstName } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import type { VerifiedIdentity } from '../auth/verifier';
import type { Db } from '../db/client';
import { users } from '../db/schema';

export type User = typeof users.$inferSelect;

/**
 * First word of the provider's display name, when it is a valid first name: the API keeps the
 * first name only (data minimization), and the user can change it.
 */
export function firstNameOf(name: string | null): string | null {
  const parsed = FirstName.safeParse(name?.trim().split(/\s+/)[0]);
  return parsed.success ? parsed.data : null;
}

async function findByFirebaseUid(db: Db, firebaseUid: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
  return user;
}

/**
 * The account of a Firebase identity, created on its first authenticated request with the
 * verified e-mail and the first name. Deleted accounts are returned as well: refusing them is the
 * caller's decision. Concurrent first requests insert once, the others read that row.
 */
export async function findOrCreateUser(db: Db, identity: VerifiedIdentity): Promise<User> {
  const existing = await findByFirebaseUid(db, identity.uid);
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(users)
    .values({
      firebaseUid: identity.uid,
      email: identity.emailVerified ? identity.email : null,
      firstName: firstNameOf(identity.name),
    })
    .onConflictDoNothing({ target: users.firebaseUid })
    .returning();
  const user = created ?? (await findByFirebaseUid(db, identity.uid));
  if (!user) {
    throw new Error('User neither created nor found');
  }
  return user;
}
