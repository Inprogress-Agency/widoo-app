import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { users } from '../db/schema';
import { testConfig } from '../test-config';
import { emailRecipientOf, pushRecipientOf } from './recipients';

// Shared database, parallel files: unique Firebase uids and push tokens, only those are deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];

let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

const fictitiousToken = () => `ExponentPushToken[fictitious-${randomUUID()}]`;
const fictitiousEmail = () => `recipient-${randomUUID()}@example.com`;

/** A signed-in account, created by its first request, with helpers acting as its phone. */
async function account(identity: { email?: string } = {}) {
  const verified = identity.email ? { email: identity.email, emailVerified: true } : {};
  const issued = verifier.issue(verified);
  createdUids.push(issued.uid);
  const headers = { authorization: `Bearer ${issued.token}` };
  const userId: string = (await app.inject({ url: '/v1/me', headers })).json().id;
  return {
    userId,
    registerPhone: async (locale: 'fr' | 'en') => {
      const pushToken = fictitiousToken();
      const payload = { pushToken, locale };
      await app.inject({ method: 'POST', url: '/v1/me/devices', headers, payload });
      return pushToken;
    },
    patch: (payload: object) => app.inject({ method: 'PATCH', url: '/v1/me', headers, payload }),
    remove: () => app.inject({ method: 'DELETE', url: '/v1/me', headers }),
  };
}

describe('pushRecipientOf', () => {
  it('sends nothing to an account without a phone', async () => {
    const { userId } = await account();
    expect(await pushRecipientOf(app.db, userId, 'reminders')).toBeNull();
  });

  it('reaches every phone, the last one first, in the language of the last phone', async () => {
    const { userId, registerPhone } = await account();
    const first = await registerPhone('fr');
    const last = await registerPhone('en');
    expect(await pushRecipientOf(app.db, userId, 'nextDay')).toEqual({
      locale: 'en',
      pushTokens: [last, first],
    });
  });

  it('writes in the language chosen by the account, whatever its phones', async () => {
    const { userId, registerPhone, patch } = await account();
    await registerPhone('fr');
    await patch({ locale: 'en' });
    expect(await pushRecipientOf(app.db, userId, 'myRoutes')).toMatchObject({ locale: 'en' });

    await patch({ locale: null });
    expect(await pushRecipientOf(app.db, userId, 'myRoutes')).toMatchObject({ locale: 'fr' });
  });

  it('sends nothing for a switched-off kind, and still sends the others', async () => {
    const { userId, registerPhone, patch } = await account();
    await registerPhone('en');
    await patch({ notificationPrefs: { reminders: false } });
    expect(await pushRecipientOf(app.db, userId, 'reminders')).toBeNull();
    expect(await pushRecipientOf(app.db, userId, 'nextDay')).toMatchObject({ locale: 'en' });
    expect(await pushRecipientOf(app.db, userId, 'myRoutes')).toMatchObject({ locale: 'en' });

    await patch({ notificationPrefs: { reminders: true } });
    expect(await pushRecipientOf(app.db, userId, 'reminders')).not.toBeNull();
  });

  it('sends nothing to a deleted or unknown account', async () => {
    const { userId, registerPhone, remove } = await account();
    await registerPhone('fr');
    await remove();
    expect(await pushRecipientOf(app.db, userId, 'nextDay')).toBeNull();
    expect(await pushRecipientOf(app.db, randomUUID(), 'nextDay')).toBeNull();
  });
});

describe('emailRecipientOf', () => {
  it('writes in French to an account that never chose a language nor registered a phone', async () => {
    const email = fictitiousEmail();
    const { userId } = await account({ email });
    expect(await emailRecipientOf(app.db, userId)).toEqual({ email, locale: 'fr' });
  });

  it('follows the account, else its last phone', async () => {
    const email = fictitiousEmail();
    const { userId, registerPhone, patch } = await account({ email });
    await registerPhone('en');
    expect(await emailRecipientOf(app.db, userId)).toEqual({ email, locale: 'en' });

    await patch({ locale: 'fr' });
    expect(await emailRecipientOf(app.db, userId)).toEqual({ email, locale: 'fr' });
  });

  it('is not silenced by the push switches', async () => {
    const email = fictitiousEmail();
    const { userId, patch } = await account({ email });
    await patch({ notificationPrefs: { reminders: false, nextDay: false, myRoutes: false } });
    expect(await emailRecipientOf(app.db, userId)).toEqual({ email, locale: 'fr' });
  });

  it('sends nothing to an account without address, deleted or unknown', async () => {
    expect(await emailRecipientOf(app.db, (await account()).userId)).toBeNull();

    const { userId, remove } = await account({ email: fictitiousEmail() });
    await remove();
    expect(await emailRecipientOf(app.db, userId)).toBeNull();
    expect(await emailRecipientOf(app.db, randomUUID())).toBeNull();
  });
});
