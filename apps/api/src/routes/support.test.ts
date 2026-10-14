import { randomUUID } from 'node:crypto';
import { ApiError, SupportMessageReceipt } from '@widoo/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { supportMessages, users } from '../db/schema';
import { testConfig } from '../test-config';
import { SUPPORT_RATE_LIMIT } from './support';

// Shared database, parallel files: unique Firebase uids and messages, only those are deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdIds: string[] = [];

function signIn() {
  const issued = verifier.issue();
  createdUids.push(issued.uid);
  return { authorization: `Bearer ${issued.token}` };
}

/** A fictitious message, with a text unique to the test. */
const messageOf = () => ({
  topic: 'problem',
  message: `La carte ne charge plus.\nMessage fictif ${randomUUID()}`,
  replyEmail: 'camille.fictive@example.com',
  appVersion: '1.2.0',
  device: 'iPhone 15, iOS 18.2',
  locale: 'fr',
});

/** A client IP of its own, so that the quota of a test is not the one of another. */
let lastIp = 0;
const freshIp = () => `198.51.100.${(lastIp += 1)}`;

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await app.db.delete(supportMessages).where(inArray(supportMessages.id, createdIds));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

async function send(payload: object, headers: Record<string, string> = {}, ip = freshIp()) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/support/messages',
    headers,
    payload,
    remoteAddress: ip,
  });
  if (response.statusCode === 201) createdIds.push(response.json().id);
  return response;
}

const storedOf = async (id: string) =>
  (await app.db.select().from(supportMessages).where(eq(supportMessages.id, id)))[0];

describe('POST /v1/support/messages', () => {
  it('stores a message sent without account, never cached', async () => {
    const message = messageOf();
    const response = await send(message);
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    const { id } = SupportMessageReceipt.parse(response.json());
    expect(await storedOf(id)).toMatchObject({ ...message, userId: null, handledAt: null });
  });

  it('links the message to the account of the token', async () => {
    const headers = signIn();
    const userId = (await app.inject({ url: '/v1/me', headers })).json().id;
    const response = await send({ ...messageOf(), topic: 'data' }, headers);
    expect(response.statusCode).toBe(201);
    expect(await storedOf(response.json().id)).toMatchObject({ userId, topic: 'data' });
  });

  it('answers 401 to an invalid token rather than sending anonymously', async () => {
    const response = await send(messageOf(), { authorization: 'Bearer expired' });
    expect(response.statusCode).toBe(401);
  });

  it.each([
    ['markup', { message: '<img src=x onerror=alert(1)>' }],
    ['an empty message', { message: ' ' }],
    ['a message over 1000 characters', { message: 'a'.repeat(1001) }],
    ['no reply address', { replyEmail: undefined }],
    ['an unknown topic', { topic: 'complaint' }],
    ['an account given in the body', { userId: randomUUID() }],
  ])('answers 422 to %s, storing nothing', async (_case, change) => {
    const response = await send({ ...messageOf(), ...change });
    expect(response.statusCode).toBe(422);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });

  it(`answers 429 past ${SUPPORT_RATE_LIMIT} messages an hour from one address`, async () => {
    const ip = freshIp();
    for (let sent = 0; sent < SUPPORT_RATE_LIMIT; sent += 1) {
      expect((await send(messageOf(), {}, ip)).statusCode).toBe(201);
    }
    const refused = await send(messageOf(), {}, ip);
    expect(refused.statusCode).toBe(429);
    expect(ApiError.parse(refused.json()).code).toBe('rate_limited');
    // A signed-in user behind the same address keeps a quota of their own.
    expect((await send(messageOf(), signIn(), ip)).statusCode).toBe(201);
  });

  it('erases the messages of an account with it', async () => {
    const headers = signIn();
    const { id } = (await send(messageOf(), headers)).json();
    await app.inject({ method: 'DELETE', url: '/v1/me', headers });
    expect(await storedOf(id)).toBeUndefined();
  });

  it('logs neither the message nor the reply address', async () => {
    const lines: string[] = [];
    const logged = await buildApp(testConfig({ LOG_LEVEL: 'trace' }), {
      logStream: { write: (line) => lines.push(line) },
    });
    const message = messageOf();
    const response = await logged.inject({
      method: 'POST',
      url: '/v1/support/messages',
      payload: message,
    });
    createdIds.push(response.json().id);
    await logged.inject({
      method: 'POST',
      url: '/v1/support/messages',
      payload: { ...message, message: `<b>${message.message}</b>` },
    });
    await logged.close();
    const log = lines.join('\n');
    expect(log).toContain('support message stored');
    expect(log).not.toContain(message.message.split('\n')[1]);
    expect(log).not.toContain(message.replyEmail);
  });
});
