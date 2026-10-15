import { PublicProfile, RouteSearchResult } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { routes, userAnecdotes, userFeaturedRoutes } from '../db/schema';
import { uuidv7 } from '../db/uuid';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';

// Shared database, parallel files: copies of the demo route on a zone of their own, far from the
// searches of other files, fictitious accounts of their own; all deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = plannedFixtures(() => app, verifier);

const zone = { lat: -35.5, lng: 19.5 };
const zoneQuery = 'bbox=19.49,-35.51,19.51,-35.49';

const meOf = async (headers: Record<string, string>) =>
  (await app.inject({ url: '/v1/me', headers })).json<{ id: string }>().id;

/** A published copy of the demo route by `authorId`, in the zone of this file. */
const routeOf = (authorId: string, values: Partial<typeof routes.$inferInsert> = {}) =>
  fixtures.copyDemoRoute({
    authorId,
    status: 'published',
    isOfficial: false,
    access: 'free',
    startLocation: zone,
    bounds: { west: zone.lng, south: zone.lat, east: zone.lng + 0.001, north: zone.lat + 0.001 },
    stats: {},
    ...values,
  });

const computed = (durationMin: number) => ({
  duration_min: durationMin,
  budget_per_person_eur: 10,
  distance_m: 2000,
});

const profileOf = (id: string, query = '', headers: Record<string, string> = {}) =>
  app.inject({ url: `/v1/users/${id}/profile${query ? `?${query}` : ''}`, headers });

let camilleId = '';
const camille = { r1: '', r2: '', r3: '', offline: [] as string[] };

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  const headers = await fixtures.signIn({
    firstName: 'Camille',
    email: 'camille.fictive@example.com',
    avatarUrl: 'https://example.com/camille.jpg',
    bio: 'Les coins calmes au bord de l’eau.',
    neighborhood: 'Paris 11e',
  });
  camilleId = await meOf(headers);
  camille.r1 = await routeOf(camilleId, {
    moods: ['food'],
    computed: computed(120),
    stats: { rating_avg: 4, rating_count: 2 },
    publishedAt: new Date('2026-01-01T10:00:00Z'),
  });
  camille.r2 = await routeOf(camilleId, {
    moods: ['nature', 'food'],
    computed: computed(60),
    stats: { rating_avg: 5, rating_count: 1 },
    publishedAt: new Date('2026-02-01T10:00:00Z'),
  });
  camille.r3 = await routeOf(camilleId, {
    moods: ['culture'],
    access: 'premium',
    computed: computed(240),
    publishedAt: new Date('2026-03-01T10:00:00Z'),
  });
  camille.offline = await Promise.all(
    (['draft', 'private', 'pending', 'unpublished'] as const).map((status) =>
      routeOf(camilleId, { status, moods: ['food'], computed: computed(30), publishedAt: null }),
    ),
  );
  await app.db.insert(userFeaturedRoutes).values([
    { userId: camilleId, routeId: camille.r3, position: 1 },
    { userId: camilleId, routeId: camille.r1, position: 2 },
    { userId: camilleId, routeId: camille.offline[0] ?? '', position: 3 },
  ]);
  await app.db.insert(userAnecdotes).values([
    {
      userId: camilleId,
      questionKey: 'ideal_sunday',
      answer: 'Un marché puis le canal.',
      position: 2,
    },
    { userId: camilleId, questionKey: 'stroll_neighborhood', answer: 'Belleville.', position: 1 },
  ]);
  // Another creator's route: never on Camille's profile.
  const other = await fixtures.signIn({ firstName: 'Lou' });
  await routeOf(await meOf(other), { moods: ['food'], computed: computed(90) });
}, 20_000);

afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

describe('GET /v1/users/:id/profile', () => {
  it('gives the public profile of a creator, as the shared schema reads it', async () => {
    const response = await profileOf(camilleId);
    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=30');
    // Never more than the public profile: no e-mail, no plan, no visibility.
    expect(response.body).not.toContain('camille.fictive');
    expect(response.body).not.toMatch(/"(email|plan|isPublic|role)"/);

    const profile = PublicProfile.parse(response.json());
    expect(profile).toMatchObject({
      id: camilleId,
      firstName: 'Camille',
      avatarUrl: 'https://example.com/camille.jpg',
      neighborhood: 'Paris 11e',
      bio: 'Les coins calmes au bord de l’eau.',
      certified: false,
      routesPublished: 3,
      routesCompleted: null,
      verifiedPlaces: null,
      moodCounts: { food: 2, nature: 1, culture: 1 },
    });
    expect(profile.ratingAvg).toBeCloseTo((4 * 2 + 5) / 3);
    expect(profile.certification.criteria.map((criterion) => criterion.criterion)).toEqual([
      'verifiedRoutes',
      'averageRating',
      'completedRoutes',
    ]);
    expect(profile.anecdotes.map((anecdote) => anecdote.questionKey)).toEqual([
      'stroll_neighborhood',
      'ideal_sunday',
    ]);
    expect(profile.anecdotes[0]?.questionLabel).toBe('Mon quartier pour flâner');
    // Featured in their order, the draft left out.
    expect(profile.featuredRoutes.map((card) => card.id)).toEqual([camille.r3, camille.r1]);
    expect(profile.featuredRoutes[1]?.author).toEqual({
      id: camilleId,
      firstName: 'Camille',
      avatarUrl: 'https://example.com/camille.jpg',
    });
    // The most recent first by default; no draft, private, pending or withdrawn route.
    expect(profile.routes).toEqual({
      items: expect.any(Array),
      nextCursor: null,
    });
    expect(profile.routes.items.map((card) => card.id)).toEqual([
      camille.r3,
      camille.r2,
      camille.r1,
    ]);
  });

  it('gives null figures to a creator without published route', async () => {
    const headers = await fixtures.signIn({ firstName: 'Noé' });
    const response = await profileOf(await meOf(headers));
    expect(response.statusCode, response.body).toBe(200);
    expect(PublicProfile.parse(response.json())).toMatchObject({
      routesPublished: null,
      ratingAvg: null,
      avatarUrl: null,
      featuredRoutes: [],
      anecdotes: [],
      routes: { items: [], nextCursor: null },
      moodCounts: {},
    });
  });
});

describe('GET /v1/users/:id/profile of a profile not to show (D-025)', () => {
  it(
    'answers the same 404 for a masked profile, a deleted account and an unknown id',
    { timeout: 20_000 },
    async () => {
      const masked = await fixtures.signIn({ firstName: 'Iris', isPublic: false });
      const maskedId = await meOf(masked);
      await routeOf(maskedId, { computed: computed(60) });

      const deleted = await fixtures.signIn({ firstName: 'Jules' });
      const deletedId = await meOf(deleted);
      const kept = await routeOf(deletedId, { title: 'Parcours fictif de Jules' });
      expect((await profileOf(deletedId)).statusCode).toBe(200);
      const deletion = await app.inject({ method: 'DELETE', url: '/v1/me', headers: deleted });
      expect(deletion.statusCode).toBe(204);

      const answers = await Promise.all([maskedId, deletedId, uuidv7()].map((id) => profileOf(id)));
      for (const answer of answers) {
        expect(answer.statusCode).toBe(404);
        expect(answer.json()).toEqual({ code: 'not_found', message: 'Profile not found' });
        expect(answer.headers['cache-control']).toBeUndefined();
      }
      // With a token too: nothing tells the three apart.
      const withToken = await profileOf(maskedId, '', masked);
      expect(withToken.statusCode).toBe(404);
      expect(withToken.body).toBe(answers[2]?.body);

      // The published route of the deleted account stays online, signed « Membre Widoo ».
      const search = await app.inject({ url: `/v1/routes/search?${zoneQuery}&sort=duration` });
      const card = RouteSearchResult.parse(search.json()).items.find((item) => item.id === kept);
      expect(card?.author).toBeNull();
    },
  );
});
