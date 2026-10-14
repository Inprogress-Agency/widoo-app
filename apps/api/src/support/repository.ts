import type { SupportMessageInput, SupportMessageReceipt } from '@widoo/shared';
import type { Db } from '../db/client';
import { supportMessages } from '../db/schema';

/**
 * Stores a message of « Nous écrire » for the team (`/admin/support`), linked to the caller's
 * account when there is one. No e-mail leaves the API: no sending provider is set up yet
 * (wiki Securite-et-RGPD › sous-traitants).
 */
export async function createSupportMessage(
  db: Db,
  userId: string | null,
  input: SupportMessageInput,
): Promise<SupportMessageReceipt> {
  const [stored] = await db
    .insert(supportMessages)
    .values({ userId, ...input })
    .returning({ id: supportMessages.id, createdAt: supportMessages.createdAt });
  if (!stored) {
    throw new Error('Support message not stored');
  }
  return { id: stored.id, createdAt: stored.createdAt.toISOString() };
}
