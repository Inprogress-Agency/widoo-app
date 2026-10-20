import { RouteDetail } from '@widoo/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStepFixtures } from '../affiliation/test-fixtures';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { steps } from '../db/schema';
import { testConfig } from '../test-config';

// A route and a place of their own for each case (`createStepFixtures`): the shared database is
// read by files that run in parallel, and the places of the seed are never changed.
let app: Awaited<ReturnType<typeof buildApp>>;
let fixtures: ReturnType<typeof createStepFixtures>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: new TestTokenVerifier(), directions: null });
  fixtures = createStepFixtures(app.db);
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

/** The first step of the sheet of the route that holds `stepId`. */
async function firstStepOfSheet(stepId: string) {
  const [step] = await app.db.select().from(steps).where(eq(steps.id, stepId));
  if (!step) throw new Error('Step missing');
  const response = await app.inject({ url: `/v1/routes/${step.routeId}` });
  expect(response.statusCode).toBe(200);
  const [first] = RouteDetail.parse(response.json()).steps;
  if (!first || first.isLocked) throw new Error('First step should be in full');
  return first;
}

describe('GET /v1/routes/:id, the booking link of a step (A-09)', () => {
  it('serves the link of the creator, and the partner link of Widoo when there is none', async () => {
    const own = await fixtures.addStep({ creatorUrl: 'https://creator.example/book' });
    const partner = await fixtures.addStep({
      partnerUrl: 'https://partner.example/place',
      programIsActive: true,
    });

    expect(await firstStepOfSheet(own)).toMatchObject({
      bookingUrl: 'https://creator.example/book',
      bookingIsAffiliate: false,
    });
    expect(await firstStepOfSheet(partner)).toMatchObject({
      bookingUrl: 'https://partner.example/place',
      bookingIsAffiliate: true,
    });
  });

  it('leaves out the partner link of a program that was switched off', async () => {
    const stepId = await fixtures.addStep({
      partnerUrl: 'https://partner.example/off',
      programIsActive: false,
    });

    expect(await firstStepOfSheet(stepId)).toMatchObject({
      bookingUrl: null,
      bookingIsAffiliate: false,
    });
  });
});
