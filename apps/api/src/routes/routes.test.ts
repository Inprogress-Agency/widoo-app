import { AppConfig, labels, taxonomies } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test-config';

describe('system routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp(testConfig({ MIN_APP_VERSION: '1.2.0' }));
  });
  afterAll(() => app.close());

  it('report a reachable database on /v1/health', async () => {
    const response = await app.inject({ url: '/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'up' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('serve taxonomies, French labels, thresholds and the minimum version on /v1/config', async () => {
    const response = await app.inject({ url: '/v1/config' });
    expect(response.statusCode).toBe(200);
    const config = AppConfig.parse(response.json());
    expect(config.minAppVersion).toBe('1.2.0');
    expect(config.taxonomies.moods).toEqual(taxonomies.moods);
    expect(config.labels.fr.moods).toEqual(labels.fr.moods);
    expect(config.thresholds.budgetEur.low).toBe(25);
  });

  it('describe both routes in the OpenAPI document outside production', async () => {
    const response = await app.inject({ url: '/docs/json' });
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().paths)).toEqual(
      expect.arrayContaining(['/v1/health', '/v1/config']),
    );
  });
});

describe('/v1/health with an unreachable database', () => {
  it('answers 503', async () => {
    const app = await buildApp(
      testConfig({ DATABASE_URL: 'postgres://widoo:widoo@127.0.0.1:1/widoo' }),
    );
    const response = await app.inject({ url: '/v1/health' });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'degraded', database: 'down' });
  });
});

describe('/docs in production', () => {
  it('is not served', async () => {
    const app = await buildApp(
      testConfig({ NODE_ENV: 'production', FIREBASE_PROJECT_ID: 'widoo-prod-check' }),
    );
    const response = await app.inject({ url: '/docs/json' });
    await app.close();
    expect(response.statusCode).toBe(404);
  });
});
