import { AppConfig, ApiError, LegalDocument } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { settings } from '../db/schema';
import { legalVersions } from '../legal/documents';
import { appVersionsKey } from '../system/app-versions';
import { testConfig } from '../test-config';

// Shared database: this file is the only one to write the `app.versions` row, deleted at the end.
let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(testConfig({ MIN_APP_VERSION: '1.2.0' }));
  // Before the first request: the versions are read then, and kept one minute.
  await app.db
    .insert(settings)
    .values({
      key: appVersionsKey,
      value: { ios: { minVersion: '1.3.0', recommendedVersion: '1.5.0' } },
    })
    .onConflictDoNothing();
});
afterAll(async () => {
  await app.db.delete(settings).where(eq(settings.key, appVersionsKey));
  await app.close();
});

describe('GET /v1/legal/:doc', () => {
  it('serves the terms in French by default, cacheable, with their version', async () => {
    const response = await app.inject({ url: '/v1/legal/terms' });
    expect(response.statusCode).toBe(200);
    const document = LegalDocument.parse(response.json());
    expect(document).toMatchObject({ doc: 'terms', locale: 'fr', version: legalVersions.terms });
    expect(document.title).toBe("Conditions d'utilisation de Widoo");
    expect(response.headers['cache-control']).toBe('public, max-age=3600');

    const again = await app.inject({
      url: '/v1/legal/terms',
      headers: { 'if-none-match': String(response.headers.etag) },
    });
    expect(again.statusCode).toBe(304);
  });

  it('serves the French privacy policy to the English app, saying so', async () => {
    const response = await app.inject({ url: '/v1/legal/privacy?locale=en' });
    expect(response.statusCode).toBe(200);
    const document = LegalDocument.parse(response.json());
    expect(document).toMatchObject({ doc: 'privacy', locale: 'fr' });
    expect(document.summary).toHaveLength(3);
  });

  it.each([
    ['an unknown text', '/v1/legal/cookies'],
    ['an unknown language', '/v1/legal/terms?locale=de'],
    ['an unknown key', '/v1/legal/terms?lang=fr'],
  ])('answers 400 to %s', async (_case, url) => {
    const response = await app.inject({ url });
    expect(response.statusCode).toBe(400);
    expect(ApiError.parse(response.json()).code).toBe('validation_error');
  });
});

describe('versions on GET /v1/config', () => {
  it('serves the builds of each platform from settings, MIN_APP_VERSION otherwise', async () => {
    const config = AppConfig.parse((await app.inject({ url: '/v1/config' })).json());
    expect(config.appVersions).toEqual({
      ios: { minVersion: '1.3.0', recommendedVersion: '1.5.0' },
      android: { minVersion: '1.2.0', recommendedVersion: '1.2.0' },
    });
    expect(config.minAppVersion).toBe('1.2.0');
  });

  it('serves the versions in force of the legal texts', async () => {
    const config = AppConfig.parse((await app.inject({ url: '/v1/config' })).json());
    expect(config.legal).toEqual(legalVersions);
  });
});
