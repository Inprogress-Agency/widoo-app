import { PlannedRouteSnapshot, stepHighlightsMax, stepPhotosMax } from '@widoo/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { snapshotOf } from '../planned/snapshot';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { media, steps } from './schema';
import { uuidv7 } from './uuid';

// The content of a step in E-07 (D-029, #129), on a copy of a demo route deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());
let routeId: string;
let stepId: string;

beforeAll(async () => {
  app = await buildApp(testConfig());
  routeId = await fixtures.copyDemoRoute();
  const [first] = await app.db
    .select({ id: steps.id })
    .from(steps)
    .where(eq(steps.routeId, routeId))
    .orderBy(asc(steps.position))
    .limit(1);
  if (!first) throw new Error('The copied route has no step');
  stepId = first.id;
});
afterAll(async () => {
  await app.db.delete(media).where(eq(media.ownerId, stepId));
  await fixtures.cleanUp();
  await app.close();
});

const setStep = (values: Partial<typeof steps.$inferInsert>) =>
  app.db.update(steps).set(values).where(eq(steps.id, stepId));

const stepPhoto = (position: number) =>
  app.db.insert(media).values({
    ownerType: 'step',
    ownerId: stepId,
    storagePath: `test/steps/${stepId}/${position}.jpg`,
    width: 1200,
    height: 800,
    position,
  });

describe('steps.highlights', () => {
  it('holds 1 to 3 points, or none', async () => {
    const points = ['Le plafond peint', 'La cour pavée', 'Le comptoir en zinc'];
    expect(points).toHaveLength(stepHighlightsMax);
    await setStep({ highlights: points });
    await setStep({ highlights: ['Le plafond peint'] });
    await setStep({ highlights: null });
    const [step] = await app.db.select().from(steps).where(eq(steps.id, stepId));
    expect(step?.highlights).toBeNull();
  });

  it.each([
    ['an empty list', []],
    ['a fourth point', ['Un', 'Deux', 'Trois', 'Quatre']],
    ['an empty point', ['Le plafond peint', '']],
  ])('refuses %s', async (_, highlights) => {
    await expect(setStep({ highlights })).rejects.toThrow();
  });
});

describe('step photos', () => {
  it('allow 5 photos per step, each position once', async () => {
    for (let position = 0; position < stepPhotosMax; position += 1) {
      await stepPhoto(position);
    }
    await expect(stepPhoto(stepPhotosMax)).rejects.toThrow();
    await expect(stepPhoto(0)).rejects.toThrow();
    const rows = await app.db.select().from(media).where(eq(media.ownerId, stepId));
    expect(rows).toHaveLength(stepPhotosMax);
  });

  it('take the photos of a revision and of an account, held to these ranks for now', async () => {
    const ownerId = uuidv7();
    const owned = (ownerType: 'revision' | 'user', position: number) =>
      app.db
        .insert(media)
        .values({ ownerType, ownerId, storagePath: 'photos/test', width: 1, height: 1, position })
        .returning({ id: media.id });
    const rows = [...(await owned('revision', 0)), ...(await owned('user', 1))];
    expect(rows).toHaveLength(2);
    // Until a migration recreates the type to name them (see `isStepMedia` in the schema).
    await expect(owned('revision', stepPhotosMax)).rejects.toThrow();
    await app.db.delete(media).where(
      inArray(
        media.id,
        rows.map((row) => row.id),
      ),
    );
  });
});

describe('steps audio columns', () => {
  it('exist, both set or both null', async () => {
    await expect(setStep({ audioPath: 'test/audio.m4a' })).rejects.toThrow();
    await expect(setStep({ audioPath: 'test/audio.m4a', audioDurationS: 0 })).rejects.toThrow();
    await setStep({ audioPath: 'test/audio.m4a', audioDurationS: 100 });
  });

  it('stay out of what the API serves', async () => {
    await setStep({ audioPath: 'test/audio.m4a', audioDurationS: 100 });
    const served = await snapshotOf(app.db, routeId, app.photoUrls);
    expect(PlannedRouteSnapshot.parse(served).steps[0]?.id).toBe(stepId);
    expect(JSON.stringify(served)).not.toMatch(/audio/i);
  });
});
