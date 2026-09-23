import type { InjectOptions } from 'fastify';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { testConfig } from './test-config';

const admin = 'https://admin.example.com';

/** Sends the requests in order to a fresh app, so that rate limit counters start at zero. */
async function inject(env: Record<string, string>, requests: InjectOptions[]) {
  const app = await buildApp(testConfig(env));
  const responses = [];
  for (const request of requests) {
    responses.push(await app.inject(request));
  }
  await app.close();
  return responses;
}

describe('security headers', () => {
  it('are set by helmet', async () => {
    const [response] = await inject({}, [{ url: '/v1/config' }]);
    expect(response?.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'strict-transport-security': expect.stringContaining('max-age='),
      'content-security-policy': expect.stringContaining("default-src 'self'"),
    });
    expect(response?.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('CORS', () => {
  it('allows the listed origins only', async () => {
    const [allowed, refused, preflight] = await inject({ CORS_ORIGINS: admin }, [
      { url: '/v1/config', headers: { origin: admin } },
      { url: '/v1/config', headers: { origin: 'https://elsewhere.example.com' } },
      {
        method: 'OPTIONS',
        url: '/v1/config',
        headers: { origin: admin, 'access-control-request-method': 'PATCH' },
      },
    ]);
    expect(allowed?.headers['access-control-allow-origin']).toBe(admin);
    expect(refused?.headers).not.toHaveProperty('access-control-allow-origin');
    expect(preflight?.headers['access-control-allow-methods']).toContain('PATCH');
  });
});

describe('rate limit', () => {
  it('answers 429 rate_limited over the limit, unknown routes included', async () => {
    const responses = await inject({ RATE_LIMIT_MAX: '2' }, [
      { url: '/v1/config' },
      { url: '/v1/nowhere' },
      { url: '/v1/nowhere' },
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 404, 429]);
    expect(responses[2]?.json()).toMatchObject({ code: 'rate_limited' });
  });

  it('counts per client behind a trusted proxy, whatever the client adds to X-Forwarded-For', async () => {
    const viaProxy = (forwardedFor: string) => ({
      url: '/v1/config',
      headers: { 'x-forwarded-for': forwardedFor },
    });
    const responses = await inject({ RATE_LIMIT_MAX: '1', TRUST_PROXY: '127.0.0.1' }, [
      viaProxy('198.51.100.1, 203.0.113.7'),
      viaProxy('198.51.100.2, 203.0.113.7'),
      viaProxy('203.0.113.8'),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 429, 200]);
  });
});
