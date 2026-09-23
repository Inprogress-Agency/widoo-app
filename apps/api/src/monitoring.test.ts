import * as Sentry from '@sentry/node';
import { inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { TestTokenVerifier } from './auth/test-verifier';
import { users } from './db/schema';
import { initMonitoring } from './monitoring';
import { testConfig } from './test-config';

// Fictitious values only. Sentry and the HTTP server are real; the transport keeps the envelopes
// instead of sending them.
const email = 'leak.sentry@example.com';
const envelopes: string[] = [];
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];

describe('initMonitoring without DSN', () => {
  it('starts no Sentry client', () => {
    initMonitoring({ sentryDsn: undefined, sentryEnvironment: 'test' });
    expect(Sentry.getClient()).toBeUndefined();
  });
});

describe('error reports', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let origin: string;

  beforeAll(async () => {
    initMonitoring({
      sentryDsn: 'https://fictitious@o0.ingest.de.sentry.io/0',
      sentryEnvironment: 'test',
      transport: () => ({
        send: async (envelope) => {
          envelopes.push(JSON.stringify(envelope));
          return {};
        },
        flush: async () => true,
      }),
    });
    app = await buildApp(testConfig(), { tokenVerifier: verifier });
    // The driver quotes the value in its message, Drizzle lists it in its own.
    app.get('/v1/test/query-crash', async () => {
      await app.db.execute(sql`select ${email}::int`);
    });
    app.get('/v1/test/auth-crash', { onRequest: app.requireAuth }, async () => {
      throw new Error(`Fictitious crash for ${email}`);
    });
    origin = await app.listen({ host: '127.0.0.1', port: 0 });
  });
  beforeEach(() => {
    envelopes.length = 0;
  });
  afterAll(async () => {
    await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
    await app.close();
    await Sentry.close();
  });

  /** The event envelope of one crash, and every envelope sent meanwhile. */
  async function crash(url: string, headers: Record<string, string> = {}) {
    const response = await fetch(`${origin}${url}?email=${email}`, {
      headers: { cookie: 'session=fictitious-cookie', ...headers },
    });
    expect(response.status).toBe(500);
    await Sentry.flush(2000);
    // With a release (GITHUB_SHA in CI, K_REVISION on Cloud Run), request counts are sent too.
    const events = envelopes.filter((envelope) => envelope.includes('"type":"event"'));
    expect(events).toHaveLength(1);
    return { event: events[0] ?? '', all: envelopes.join('\n') };
  }

  it('sends the cleaned error, without query parameters, cookie or e-mail', async () => {
    const { event, all } = await crash('/v1/test/query-crash');
    expect(event).toContain('Failed query: select $1::int');
    expect(event).toContain('GET /v1/test/query-crash');
    for (const leak of [email, 'leak.sentry', 'fictitious-cookie', '?email']) {
      expect(all).not.toContain(leak);
    }
    expect(event).not.toContain('"user"');
  });

  it('reports the caller by opaque id only, without token or Firebase uid', async () => {
    const { token, uid } = verifier.issue({ email, emailVerified: true, name: 'Camille Exemple' });
    createdUids.push(uid);
    const headers = { authorization: `Bearer ${token}` };
    const { event, all } = await crash('/v1/test/auth-crash', headers);
    const [user] = await app.db
      .select()
      .from(users)
      .where(inArray(users.firebaseUid, [uid]));
    expect(event).toContain(`"user":{"id":"${user?.id}"}`);
    for (const leak of [token, uid, email, 'Camille', 'fictitious-cookie']) {
      expect(all).not.toContain(leak);
    }
    expect(event).toContain('Fictitious crash for [email]');
  });
});
