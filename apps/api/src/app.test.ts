import { ApiError, RouteSearchQuery } from '@widoo/shared';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildApp, type BuildAppOptions } from './app';
import { testConfig } from './test-config';

/** The API with test-only routes: the error handling and logging they exercise are global. */
async function buildTestApp(env: Record<string, string> = {}, options: BuildAppOptions = {}) {
  const app = await buildApp(testConfig(env), options);
  app.get(
    '/v1/test/search',
    {
      schema: {
        querystring: z.object({ limit: z.coerce.number().int().max(50), sort: z.enum(['rating']) }),
      },
    },
    async () => ({ ok: true }),
  );
  app.get('/v1/test/routes', { schema: { querystring: RouteSearchQuery } }, async () => ({
    ok: true,
  }));
  app.post('/v1/test/echo', { schema: { body: z.object({ title: z.string() }) } }, async () => ({
    ok: true,
  }));
  app.get('/v1/test/crash', async () => {
    throw new Error('fictitious internal detail');
  });
  // The driver quotes the value in its message, Drizzle lists it in its own.
  app.get('/v1/test/query-crash', async () => {
    await app.db.execute(sql`select ${'leak.test@example.com'}::int`);
  });
  await app.ready();
  return app;
}

describe('error handling', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(() => app.close());

  it('answers an invalid request with 400 validation_error and the invalid fields', async () => {
    const response = await app.inject({ url: '/v1/test/search?limit=51&sort=nearest' });
    expect(response.statusCode).toBe(400);
    const error = ApiError.parse(response.json());
    expect(error.code).toBe('validation_error');
    expect(error.details?.issues).toEqual([
      expect.objectContaining({ location: 'querystring', path: 'limit', code: 'too_big' }),
      expect.objectContaining({ location: 'querystring', path: 'sort', code: 'invalid_value' }),
    ]);
  });

  it('accepts the budget key high and answers the former key premium with validation_error', async () => {
    const bbox = '2.33,48.85,2.37,48.87';
    const accepted = await app.inject({ url: `/v1/test/routes?bbox=${bbox}&budgets=high` });
    expect(accepted.statusCode).toBe(200);
    const refused = await app.inject({ url: `/v1/test/routes?bbox=${bbox}&budgets=premium` });
    expect(refused.statusCode).toBe(400);
    const error = ApiError.parse(refused.json());
    expect(error.code).toBe('validation_error');
    expect(error.details?.issues).toEqual([
      expect.objectContaining({ location: 'querystring', path: 'budgets' }),
    ]);
  });

  it('answers a malformed JSON body with 400 validation_error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/test/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"title":',
    });
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });

  it('answers an unknown route with 404 not_found', async () => {
    const response = await app.inject({ url: '/v1/nowhere' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not_found', message: 'Route not found' });
  });

  it('hides the cause of an unexpected error behind 500 internal_error', async () => {
    const response = await app.inject({ url: '/v1/test/crash' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: 'internal_error', message: 'Internal server error' });
    expect(response.body).not.toContain('fictitious internal detail');
  });
});

describe('request logs', () => {
  it('carry the request id but no header, query string or IP address', async () => {
    const lines: string[] = [];
    const app = await buildTestApp(
      { LOG_LEVEL: 'info' },
      { logStream: { write: (line) => lines.push(line) } },
    );
    const response = await app.inject({
      url: '/v1/test/search?limit=10&sort=rating&near=48.8566,2.3522',
      headers: {
        authorization: 'Bearer fictitious-token',
        cookie: 'session=fictitious',
        'x-request-id': 'req-123',
      },
    });
    await app.close();

    expect(response.headers['x-request-id']).toBe('req-123');
    const logs = lines.join('');
    expect(logs).toContain('"requestId":"req-123"');
    expect(logs).toContain('"path":"/v1/test/search"');
    for (const leak of ['fictitious-token', 'session=fictitious', '48.8566', 'remoteAddress']) {
      expect(logs).not.toContain(leak);
    }
  });

  it('carry the SQL of a failed query but none of its values', async () => {
    const lines: string[] = [];
    const app = await buildTestApp(
      { LOG_LEVEL: 'info' },
      { logStream: { write: (line) => lines.push(line) } },
    );
    const response = await app.inject({ url: '/v1/test/query-crash' });
    await app.close();

    expect(response.statusCode).toBe(500);
    const logs = lines.join('');
    expect(logs).toContain('Failed query: select $1::int');
    expect(logs).toContain('"code":"22P02"');
    expect(logs).toContain('app.test.ts');
    expect(logs).not.toContain('leak.test@example.com');
  });

  it('replace a malformed request id', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      url: '/v1/nowhere',
      headers: { 'x-request-id': 'not an id\n{"level":60}' },
    });
    await app.close();
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
