import {
  AdminSupportMessage,
  AdminCounters,
  AdminStats,
  AdminSupportMessages,
  ApiError,
  SupportAlreadyHandledDetails,
  type SupportTopic,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, supportMessages, users } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: accounts and messages of their own, found by their ids.
const verifier = new TestTokenVerifier();
const teamUids: string[] = [];
const authorIds: string[] = [];
const messageIds: string[] = [];

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await app.db.delete(adminActions).where(inArray(adminActions.targetId, messageIds));
  await app.db.delete(supportMessages).where(inArray(supportMessages.id, messageIds));
  await app.db.delete(users).where(inArray(users.id, authorIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, teamUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  teamUids.push(uid);
  const [user] = await app.db.insert(users).values({ firebaseUid: uid, role }).returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

/** A message sent `minutesAgo`, with an account named `firstName` or without one. */
async function addMessage(
  minutesAgo: number,
  values: Partial<typeof supportMessages.$inferInsert> & { firstName?: string } = {},
) {
  const { firstName, ...rest } = values;
  let userId: string | null = null;
  if (firstName) {
    const [author] = await app.db
      .insert(users)
      .values({ firebaseUid: `support-${uuidv7()}`, firstName })
      .returning();
    if (!author) throw new Error('Author not created');
    authorIds.push(author.id);
    userId = author.id;
  }
  const [row] = await app.db
    .insert(supportMessages)
    .values({
      userId,
      replyEmail: 'camille@example.com',
      topic: 'question' satisfies SupportTopic,
      message: 'Une question sur mon compte.',
      appVersion: '0.1.0',
      device: 'iPhone 15, iOS 18.2',
      locale: 'fr',
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
      ...rest,
    })
    .returning();
  if (!row) throw new Error('Message not created');
  messageIds.push(row.id);
  return row;
}

type Headers = Record<string, string>;
const get = (headers: Headers, url: string) =>
  app.inject({ url: `/v1/admin/support${url}`, headers });
const listed = async (headers: Headers, query = '') =>
  AdminSupportMessages.parse((await get(headers, query)).json());

describe('who may read the messages of the support', () => {
  it('is for moderators and admins, not for an editor, nor for someone signed out', async () => {
    const moderator = await signIn('moderator');
    const admin = await signIn('admin');
    const editor = await signIn('editor');

    expect((await get(moderator.headers, '')).statusCode).toBe(200);
    expect((await get(admin.headers, '')).statusCode).toBe(200);
    expect((await get(editor.headers, '')).statusCode).toBe(403);
    expect((await app.inject({ url: '/v1/admin/support' })).statusCode).toBe(401);
  });
});

describe('GET /v1/admin/support', () => {
  it('lists the messages to handle first, the oldest first, then the handled ones', async () => {
    const moderator = await signIn('moderator');
    const newer = await addMessage(10, { firstName: 'Léa' });
    const older = await addMessage(60);
    const done = await addMessage(30, { handledAt: new Date() });
    const mine = new Set([newer.id, older.id, done.id]);

    const page = await listed(moderator.headers);

    expect(page.items.filter((item) => mine.has(item.id)).map((item) => item.id)).toEqual([
      older.id,
      newer.id,
      done.id,
    ]);
    const row = page.items.find((item) => item.id === newer.id);
    expect(row).toMatchObject({
      topic: 'question',
      preview: 'Une question sur mon compte.',
      author: { firstName: 'Léa' },
      handledAt: null,
    });
    expect(page.items.find((item) => item.id === older.id)?.author).toBeNull();
  });

  it('keeps the messages to handle, or the handled ones, when asked', async () => {
    const moderator = await signIn('moderator');
    const open = await addMessage(5);
    const done = await addMessage(5, { handledAt: new Date() });

    const unhandled = (await listed(moderator.headers, '?status=unhandled')).items.map(
      (item) => item.id,
    );
    const handled = (await listed(moderator.headers, '?status=handled')).items.map(
      (item) => item.id,
    );

    expect(unhandled).toContain(open.id);
    expect(unhandled).not.toContain(done.id);
    expect(handled).toContain(done.id);
    expect(handled).not.toContain(open.id);
    expect((await get(moderator.headers, '?status=answered')).statusCode).toBe(400);
  });
});

describe('GET /v1/admin/support/:id', () => {
  it('reads a message in full, with what the app joined to it', async () => {
    const admin = await signIn('admin');
    const row = await addMessage(5, {
      firstName: 'Camille',
      topic: 'problem',
      message: "L'app se ferme.\nTrois fois de suite.",
      replyEmail: 'reponse@example.com',
      locale: 'en',
    });

    const response = await get(admin.headers, `/${row.id}`);

    expect(response.statusCode).toBe(200);
    expect(AdminSupportMessage.parse(response.json())).toMatchObject({
      id: row.id,
      topic: 'problem',
      message: "L'app se ferme.\nTrois fois de suite.",
      replyEmail: 'reponse@example.com',
      appVersion: '0.1.0',
      device: 'iPhone 15, iOS 18.2',
      locale: 'en',
      author: { firstName: 'Camille' },
    });
  });

  it('answers 404 to an unknown message, and never serves it to an editor', async () => {
    const admin = await signIn('admin');
    const editor = await signIn('editor');
    const row = await addMessage(5);

    expect((await get(admin.headers, `/${uuidv7()}`)).statusCode).toBe(404);
    expect((await get(editor.headers, `/${row.id}`)).statusCode).toBe(403);
    const [stored] = await app.db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.id, row.id));
    expect(stored?.handledAt).toBeNull();
  });
});

const handle = (headers: Headers, id: string) =>
  app.inject({ method: 'POST', url: `/v1/admin/support/${id}/handled`, headers });

describe('POST /v1/admin/support/:id/handled', () => {
  it('marks a message handled, moves it down the list, and journals it', async () => {
    const moderator = await signIn('moderator');
    const row = await addMessage(20);

    const response = await handle(moderator.headers, row.id);

    expect(response.statusCode).toBe(200);
    const card = AdminSupportMessage.parse(response.json());
    expect(card.handledAt).not.toBeNull();
    const unhandled = await listed(moderator.headers, '?status=unhandled');
    expect(unhandled.items.map((item) => item.id)).not.toContain(row.id);
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, row.id));
    expect(entry).toMatchObject({
      action: 'support_message.handle',
      targetType: 'support_message',
      actorId: moderator.id,
      before: { handledAt: null },
    });
  });

  it('answers 409 already_decided to a second decision, with the time of the first', async () => {
    const admin = await signIn('admin');
    const other = await signIn('moderator');
    const row = await addMessage(20);
    const first = AdminSupportMessage.parse((await handle(other.headers, row.id)).json());

    const again = await handle(admin.headers, row.id);

    expect(again.statusCode).toBe(409);
    const error = ApiError.parse(again.json());
    expect(error.code).toBe('already_decided');
    expect(SupportAlreadyHandledDetails.parse(error.details)).toEqual({
      handledAt: first.handledAt,
    });
  });

  it('answers 404 to an unknown message, and refuses an editor without writing', async () => {
    const admin = await signIn('admin');
    const editor = await signIn('editor');
    const row = await addMessage(20);

    expect((await handle(admin.headers, uuidv7())).statusCode).toBe(404);
    expect((await handle(editor.headers, row.id)).statusCode).toBe(403);
    const [stored] = await app.db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.id, row.id));
    expect(stored?.handledAt).toBeNull();
  });
});

describe('the counters of the support', () => {
  const counterOf = async (headers: Headers) =>
    AdminCounters.parse((await app.inject({ url: '/v1/admin/counters', headers })).json()).support;
  const tileOf = async (headers: Headers) =>
    AdminStats.parse((await app.inject({ url: '/v1/admin/stats', headers })).json()).toHandle
      .support;

  // Other test files write messages meanwhile: the figures are read as « at least ».
  it('counts the messages to handle, and those waiting for more than 72 hours', async () => {
    const moderator = await signIn('moderator');
    await addMessage(10);
    const old = await addMessage(80 * 60);

    const counter = await counterOf(moderator.headers);
    const tile = await tileOf(moderator.headers);

    expect(counter?.count).toBeGreaterThanOrEqual(2);
    expect(counter?.lateCount).toBeGreaterThanOrEqual(1);
    expect(tile?.count).toBeGreaterThanOrEqual(2);
    expect(tile?.lateCount).toBeGreaterThanOrEqual(1);
    expect(new Date(tile?.oldestSince ?? '').getTime()).toBeLessThanOrEqual(
      old.createdAt.getTime(),
    );
  });

  it('gives an editor no counter of the support', async () => {
    const editor = await signIn('editor');
    expect(await counterOf(editor.headers)).toBeUndefined();
  });
});
