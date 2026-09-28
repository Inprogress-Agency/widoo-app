import { ApiError } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';
import type { InternalJobs } from './internal';

const token = 'fictitious-service-token-0123456789abcdef';
const url = '/v1/internal/recommendation';

describe('POST /v1/internal/recommendation', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const calls: Date[] = [];
  // The real job recomputes every published route of the shared database: replaced here, and
  // tested on its own rows in recommendation/job.test.ts.
  const jobs: InternalJobs = {
    recommendation: async (_db, now) => {
      calls.push(now);
      return { updated: 3 };
    },
  };
  beforeAll(async () => {
    app = await buildApp(testConfig({ INTERNAL_TOKEN: token }), { internalJobs: jobs });
  });
  afterAll(() => app.close());

  it('runs the job with the service token, never cached', async () => {
    const response = await app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ updated: 3 });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(calls).toHaveLength(1);
  });

  it.each([
    ['without a token', {}],
    ['with another token', { authorization: `Bearer ${token.slice(0, -1)}x` }],
    ['with a longer token', { authorization: `Bearer ${token}0` }],
    ['with the token outside Bearer', { authorization: token }],
  ])('refuses a call %s with 401, without running the job', async (_, headers) => {
    const before = calls.length;
    const response = await app.inject({ method: 'POST', url, headers });
    expect(response.statusCode).toBe(401);
    expect(ApiError.parse(response.json()).code).toBe('unauthorized');
    expect(calls).toHaveLength(before);
  });

  it('is only a POST', async () => {
    const response = await app.inject({ url, headers: { authorization: `Bearer ${token}` } });
    expect(response.statusCode).toBe(404);
  });
});

describe('internal routes without a service token', () => {
  it('do not exist', async () => {
    const app = await buildApp(testConfig());
    try {
      const response = await app.inject({
        method: 'POST',
        url,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

describe('injected internal jobs', () => {
  it('are refused in production', async () => {
    const production = testConfig({
      NODE_ENV: 'production',
      FIREBASE_PROJECT_ID: 'widoo-prod-check',
      INTERNAL_TOKEN: token,
    });
    await expect(
      buildApp(production, {
        internalJobs: { recommendation: async () => ({ updated: 0 }) },
      }),
    ).rejects.toThrow(/refused in production/);
  });
});
