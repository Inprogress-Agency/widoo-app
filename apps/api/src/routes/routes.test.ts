import {
  AppConfig,
  bucketSettingKeys,
  defaultBucketThresholds,
  defaultCertificationThresholds,
  labels,
  taxonomies,
} from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { anecdoteQuestions, settings } from '../db/schema';
import { seed } from '../db/seed';
import { anecdoteQuestionsAtLaunch } from '../db/seed/anecdote-questions';
import { testConfig } from '../test-config';

// Shared database, parallel files: a retired question of this file only, deleted by key.
const retiredQuestion = 'test_config_retired_question';

describe('system routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp(testConfig({ MIN_APP_VERSION: '1.2.0' }));
    await seed(app.db);
    await app.db
      .insert(anecdoteQuestions)
      .values({ key: retiredQuestion, label: 'Question retirée', position: 4, isActive: false });
  });
  afterAll(async () => {
    await app.db.delete(anecdoteQuestions).where(eq(anecdoteQuestions.key, retiredQuestion));
    await app.close();
  });

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
    expect(config.taxonomies.budgets).toEqual(['free', 'low', 'medium', 'high']);
    expect(config.labels.fr.budgets).toEqual(labels.fr.budgets);
    expect(config.labels.fr.budgets.high).toBe('Plus de 70 €');
    expect(config.labels.fr.durations).toEqual(labels.fr.durations);
  });

  it('serve the active anecdote questions in order, without the retired ones, on /v1/config', async () => {
    const config = AppConfig.parse((await app.inject({ url: '/v1/config' })).json());
    // Keys and order: the seed test edits the label of `work_cafe` for a moment.
    expect(config.anecdoteQuestions.map(({ key, position }) => ({ key, position }))).toEqual(
      anecdoteQuestionsAtLaunch.map(({ key, position }) => ({ key, position })),
    );
    expect(config.anecdoteQuestions).toContainEqual({
      key: 'hidden_gem',
      label: 'Un bon plan que personne ne connaît',
      position: 3,
    });
    expect(config.anecdoteQuestions.map((question) => question.key)).not.toContain(retiredQuestion);
  });

  it('serve the certification thresholds of settings on /v1/config', async () => {
    const config = AppConfig.parse((await app.inject({ url: '/v1/config' })).json());
    expect(config.certificationThresholds).toEqual(defaultCertificationThresholds);
  });

  it('describe the public routes in the OpenAPI document outside production', async () => {
    const response = await app.inject({ url: '/docs/json' });
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().paths)).toEqual(
      expect.arrayContaining([
        '/v1/health',
        '/v1/config',
        '/v1/routes/search',
        '/v1/routes/search/count',
      ]),
    );
  });
});

describe('the buckets of settings on /v1/config', () => {
  // Shared database, parallel files: a full day one minute longer, which classifies no route of
  // the other files differently, deleted at the end.
  const durationMin = { ...defaultBucketThresholds.durationMin, full_day: 721 };
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp(testConfig());
    await app.db
      .insert(settings)
      .values({ key: bucketSettingKeys.durationMin, value: durationMin })
      .onConflictDoUpdate({ target: settings.key, set: { value: durationMin } });
  });
  afterAll(async () => {
    await app.db.delete(settings).where(eq(settings.key, bucketSettingKeys.durationMin));
    await app.close();
  });

  it('serves the bounds read from settings, each group on its default without a row', async () => {
    const config = AppConfig.parse((await app.inject({ url: '/v1/config' })).json());
    expect(config.thresholds).toEqual({
      budgetEur: defaultBucketThresholds.budgetEur,
      durationMin,
    });
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
