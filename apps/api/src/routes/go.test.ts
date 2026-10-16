import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStepFixtures } from '../affiliation/test-fixtures';
import { buildApp } from '../app';
import { bookingClicks } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

let app: Awaited<ReturnType<typeof buildApp>>;
let fixtures: ReturnType<typeof createStepFixtures>;
beforeAll(async () => {
  app = await buildApp(testConfig());
  await seed(app.db);
  fixtures = createStepFixtures(app.db);
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

const go = (stepId: string) => app.inject({ url: `/v1/go/${stepId}` });
const clicksOf = (stepId: string) =>
  app.db.select().from(bookingClicks).where(eq(bookingClicks.stepId, stepId));

describe('GET /v1/go/:stepId', () => {
  it('counts the click then redirects to the link of the creator', async () => {
    const stepId = await fixtures.addStep({ creatorUrl: 'https://creator.example/reserver' });
    const response = await go(stepId);
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('https://creator.example/reserver');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(await clicksOf(stepId)).toMatchObject([{ linkOrigin: 'creator', userId: null }]);
  });

  it('says when the link of the creator is an affiliate link', async () => {
    const stepId = await fixtures.addStep({
      creatorUrl: 'https://creator.example/aff',
      isAffiliate: true,
    });
    await go(stepId);
    expect(await clicksOf(stepId)).toMatchObject([{ linkOrigin: 'creator_affiliate' }]);
  });

  it('puts the link of the creator before the partner link of Widoo', async () => {
    const stepId = await fixtures.addStep({
      creatorUrl: 'https://creator.example/reserver',
      partnerUrl: 'https://partner.example/reserver',
      programIsActive: true,
    });
    const response = await go(stepId);
    expect(response.headers.location).toBe('https://creator.example/reserver');
    expect(await clicksOf(stepId)).toMatchObject([{ linkOrigin: 'creator' }]);
  });

  it('falls back to the partner link when the creator set none, unless its program is inactive', async () => {
    const active = await fixtures.addStep({
      partnerUrl: 'https://partner.example/ok',
      programIsActive: true,
    });
    const response = await go(active);
    expect(response.headers.location).toBe('https://partner.example/ok');
    expect(await clicksOf(active)).toMatchObject([{ linkOrigin: 'partner' }]);

    const inactive = await fixtures.addStep({
      partnerUrl: 'https://partner.example/off',
      programIsActive: false,
    });
    expect((await go(inactive)).statusCode).toBe(404);
    expect(await clicksOf(inactive)).toHaveLength(0);
  });

  it('answers 404, counts nothing and redirects nowhere for a step without link, off line or unknown', async () => {
    const noLink = await fixtures.addStep({});
    const draft = await fixtures.addStep({
      creatorUrl: 'https://creator.example',
      routeStatus: 'draft',
    });
    for (const stepId of [noLink, draft, uuidv7()]) {
      const response = await go(stepId);
      expect(response.statusCode).toBe(404);
      expect(response.headers.location).toBeUndefined();
      expect(await clicksOf(stepId)).toHaveLength(0);
    }
    expect((await app.inject({ url: '/v1/go/not-an-id' })).statusCode).toBe(400);
  });

  it('counts and redirects in less than 200 ms', async () => {
    const stepId = await fixtures.addStep({ creatorUrl: 'https://creator.example/vite' });
    await go(stepId);
    const startedAt = performance.now();
    const response = await go(stepId);
    expect(response.statusCode).toBe(302);
    expect(performance.now() - startedAt).toBeLessThan(200);
    expect(await clicksOf(stepId)).toHaveLength(2);
  });
});
