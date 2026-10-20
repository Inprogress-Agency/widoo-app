import {
  adminSupportPageSize,
  type AdminSupportMessage,
  type AdminSupportMessages,
  type AdminSupportQuery,
  type SupportAlreadyHandledDetails,
} from '@widoo/shared';
import { and, count, desc, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
import { recordAdminAction } from '../admin/actions';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';
import type { Db, Tx } from '../db/client';
import { supportMessages, users } from '../db/schema';
import { httpError } from '../errors';

/** Characters of a message the list shows, on one line. */
const previewLength = 120;

/** The beginning of a message on one line, cut on a character and not in the middle of one. */
export function previewOf(message: string): string {
  const line = message.replaceAll(/\s+/g, ' ').trim();
  const characters = [...line];
  return characters.length <= previewLength
    ? line
    : `${characters.slice(0, previewLength).join('').trimEnd()}…`;
}

const authorOf = (row: { userId: string | null; firstName: string | null }) =>
  row.userId ? { id: row.userId, firstName: row.firstName } : null;

const filterOf = (query: AdminSupportQuery): SQL | undefined =>
  query.status === 'unhandled'
    ? isNull(supportMessages.handledAt)
    : query.status === 'handled'
      ? isNotNull(supportMessages.handledAt)
      : undefined;

/**
 * A page of the messages of « Nous écrire » (A-13): the ones to handle first, the oldest first,
 * since they wait for an answer; then the handled ones, the latest first.
 */
export async function readSupportMessages(
  db: Db,
  query: AdminSupportQuery,
): Promise<AdminSupportMessages> {
  const offset = offsetOfCursor(query.cursor);
  const where = and(filterOf(query));
  const [totals] = await db.select({ value: count() }).from(supportMessages).where(where);
  const rows = await db
    .select({
      id: supportMessages.id,
      topic: supportMessages.topic,
      message: supportMessages.message,
      createdAt: supportMessages.createdAt,
      handledAt: supportMessages.handledAt,
      userId: supportMessages.userId,
      firstName: users.firstName,
    })
    .from(supportMessages)
    .leftJoin(users, eq(users.id, supportMessages.userId))
    .where(where)
    .orderBy(
      sql`(${supportMessages.handledAt} is not null)`,
      sql`case when ${supportMessages.handledAt} is null then ${supportMessages.createdAt} end asc`,
      desc(supportMessages.createdAt),
      desc(supportMessages.id),
    )
    .limit(adminSupportPageSize)
    .offset(offset);
  const total = totals?.value ?? 0;
  return {
    items: rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      preview: previewOf(row.message),
      author: authorOf(row),
      createdAt: row.createdAt.toISOString(),
      handledAt: row.handledAt?.toISOString() ?? null,
    })),
    total,
    offset,
    ...neighbourCursors(offset, total, adminSupportPageSize),
  };
}

/** A message in full, or null when it does not exist. */
export async function readSupportMessage(
  db: Db | Tx,
  id: string,
): Promise<AdminSupportMessage | null> {
  const [row] = await db
    .select({
      id: supportMessages.id,
      topic: supportMessages.topic,
      message: supportMessages.message,
      replyEmail: supportMessages.replyEmail,
      appVersion: supportMessages.appVersion,
      device: supportMessages.device,
      locale: supportMessages.locale,
      createdAt: supportMessages.createdAt,
      handledAt: supportMessages.handledAt,
      userId: supportMessages.userId,
      firstName: users.firstName,
    })
    .from(supportMessages)
    .leftJoin(users, eq(users.id, supportMessages.userId))
    .where(eq(supportMessages.id, id));
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    topic: row.topic,
    message: row.message,
    replyEmail: row.replyEmail,
    appVersion: row.appVersion,
    device: row.device,
    locale: row.locale,
    author: authorOf(row),
    createdAt: row.createdAt.toISOString(),
    handledAt: row.handledAt?.toISOString() ?? null,
  };
}

/**
 * Marks a message handled by the team (A-13), with its journal line. 404 for an unknown message,
 * 409 `already_decided` with the time when another member handled it first.
 */
export async function markSupportMessageHandled(
  db: Db,
  actorId: string,
  id: string,
  now = new Date(),
): Promise<AdminSupportMessage> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ handledAt: supportMessages.handledAt })
      .from(supportMessages)
      .where(eq(supportMessages.id, id))
      .for('update');
    if (!current) {
      throw httpError(404, 'Message not found');
    }
    if (current.handledAt) {
      const details: SupportAlreadyHandledDetails = { handledAt: current.handledAt.toISOString() };
      throw httpError(409, 'Message already handled', 'already_decided', details);
    }
    await tx.update(supportMessages).set({ handledAt: now }).where(eq(supportMessages.id, id));
    await recordAdminAction(tx, {
      actorId,
      action: 'support_message.handle',
      targetType: 'support_message',
      targetId: id,
      before: { handledAt: null },
      after: { handledAt: now.toISOString() },
    });
    const message = await readSupportMessage(tx, id);
    if (!message) {
      throw httpError(404, 'Message not found');
    }
    return message;
  });
}
