import { ApiError, Me } from '@widoo/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type BuildAppOptions } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import {
  anecdoteQuestions,
  places,
  routes,
  steps,
  userAnecdotes,
  userFeaturedRoutes,
  users,
} from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: unique Firebase uids, routes, places and question, deleted
// by id. No label of `work_cafe` is read: the seed test edits it for a moment. The routes have no location, so that no search of another file finds them.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const createdRouteIds: string[] = [];
const placeIds = { verified: uuidv7(), stale: uuidv7() };
const retiredQuestion = 'test_retired_question';
let cityId = '';

const build = (env: Record<string, string> = {}, options: BuildAppOptions = {}) =>
  buildApp(testConfig(env), { tokenVerifier: verifier, ...options });
let app: Awaited<ReturnType<typeof build>>;

beforeAll(async () => {
  app = await build();
  ({ cityId } = await seed(app.db));
  await app.db
    .insert(anecdoteQuestions)
    .values({ key: retiredQuestion, label: 'Question retirée', position: 99, isActive: false });
  await app.db.insert(places).values(
    (['verified', 'stale'] as const).map((status) => ({
      id: placeIds[status],
      cityId,
      name: `Lieu fictif ${status}`,
      category: 'bakery' as const,
      location: { lat: -40, lng: -40 },
      address: 'Adresse fictive',
      verificationStatus: status,
    })),
  );
});
afterAll(async () => {
  await app.db.delete(routes).where(inArray(routes.id, createdRouteIds));
  await app.db.delete(places).where(inArray(places.id, Object.values(placeIds)));
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.db.delete(anecdoteQuestions).where(eq(anecdoteQuestions.key, retiredQuestion));
  await app.close();
});

/** A signed-in account, created by a first GET /me. */
async function signIn() {
  const issued = verifier.issue({ email: 'camille.profil@example.com', name: 'Camille' });
  createdUids.push(issued.uid);
  const headers = { authorization: `Bearer ${issued.token}` };
  const userId = Me.parse((await app.inject({ url: '/v1/me', headers })).json()).id;
  return { headers, userId };
}

type RouteValues = Partial<typeof routes.$inferInsert>;
async function createRoute(values: RouteValues, placeIdsOfSteps: string[] = []) {
  const id = uuidv7();
  createdRouteIds.push(id);
  await app.db
    .insert(routes)
    .values({ id, cityId, status: 'published', title: `Parcours ${id.slice(-4)}`, ...values });
  if (placeIdsOfSteps.length > 0) {
    await app.db.insert(steps).values(
      placeIdsOfSteps.map((placeId, position) => ({
        routeId: id,
        position,
        placeId,
        durationMin: 30,
      })),
    );
  }
  return id;
}

const getMe = async (headers: Record<string, string>) =>
  Me.parse((await app.inject({ url: '/v1/me', headers })).json());
const patchMe = (headers: Record<string, string>, payload: object) =>
  app.inject({ method: 'PATCH', url: '/v1/me', headers, payload });

/** Everything a PATCH may write, to compare before and after a refused one. */
async function storedProfile(userId: string) {
  const [user] = await app.db.select().from(users).where(eq(users.id, userId));
  const anecdotes = await app.db
    .select({ questionKey: userAnecdotes.questionKey, answer: userAnecdotes.answer })
    .from(userAnecdotes)
    .where(eq(userAnecdotes.userId, userId))
    .orderBy(asc(userAnecdotes.position));
  const featured = await app.db
    .select({ routeId: userFeaturedRoutes.routeId })
    .from(userFeaturedRoutes)
    .where(eq(userFeaturedRoutes.userId, userId))
    .orderBy(asc(userFeaturedRoutes.position));
  return { user, anecdotes, featured };
}

describe('PATCH /v1/me, profile', () => {
  it('saves bio, neighborhood, anecdotes and featured routes in order', async () => {
    const { headers, userId } = await signIn();
    const first = await createRoute({ authorId: userId });
    const second = await createRoute({ authorId: userId });
    const response = await patchMe(headers, {
      bio: ' Flâneuse du dimanche. ',
      neighborhood: 'Paris 11e',
      anecdotes: [
        { questionKey: 'work_cafe', answer: 'Un café de la rue Oberkampf.' },
        { questionKey: 'hidden_gem', answer: 'Un passage couvert.' },
      ],
      featuredRouteIds: [second, first],
    });

    expect(response.statusCode, response.body).toBe(200);
    const { user, anecdotes, featured } = await storedProfile(userId);
    expect(user).toMatchObject({ bio: 'Flâneuse du dimanche.', neighborhood: 'Paris 11e' });
    expect(anecdotes).toEqual([
      { questionKey: 'work_cafe', answer: 'Un café de la rue Oberkampf.' },
      { questionKey: 'hidden_gem', answer: 'Un passage couvert.' },
    ]);
    expect(featured).toEqual([{ routeId: second }, { routeId: first }]);
  });

  it('clears the bio and neighborhood with null and the lists with an empty one', async () => {
    const { headers, userId } = await signIn();
    const routeId = await createRoute({ authorId: userId });
    await patchMe(headers, {
      bio: 'Flâneuse.',
      neighborhood: 'Paris 11e',
      anecdotes: [{ questionKey: 'hidden_gem', answer: 'Un passage couvert.' }],
      featuredRouteIds: [routeId],
    });

    const response = await patchMe(headers, {
      bio: null,
      neighborhood: null,
      anecdotes: [],
      featuredRouteIds: [],
    });
    expect(response.statusCode).toBe(200);
    const { user, anecdotes, featured } = await storedProfile(userId);
    expect(user).toMatchObject({ bio: null, neighborhood: null });
    expect({ anecdotes, featured }).toEqual({ anecdotes: [], featured: [] });
  });

  it('keeps an answer to a question retired since, but never lets one be chosen', async () => {
    const { headers, userId } = await signIn();
    await app.db
      .insert(userAnecdotes)
      .values({ userId, questionKey: retiredQuestion, answer: 'Avant.', position: 1 });

    const kept = await patchMe(headers, {
      anecdotes: [{ questionKey: retiredQuestion, answer: 'Après.' }],
    });
    expect(kept.statusCode, kept.body).toBe(200);
    expect((await storedProfile(userId)).anecdotes).toEqual([
      { questionKey: retiredQuestion, answer: 'Après.' },
    ]);

    const other = await signIn();
    const chosen = await patchMe(other.headers, {
      anecdotes: [{ questionKey: retiredQuestion, answer: 'Ici.' }],
    });
    expect(chosen.statusCode).toBe(422);
  });

  const answer = (questionKey: string) => ({ questionKey, answer: 'Le canal.' });
  it.each([
    ['a bio over 150 characters', () => ({ bio: 'a'.repeat(151) }), 'bio'],
    [
      'an answer over 150 characters',
      () => ({ anecdotes: [{ questionKey: 'hidden_gem', answer: 'a'.repeat(151) }] }),
      'anecdotes.0.answer',
    ],
    [
      'four anecdotes',
      () => ({ anecdotes: ['hidden_gem', 'work_cafe', 'ideal_sunday', 'best_memory'].map(answer) }),
      'anecdotes',
    ],
    [
      'a question answered twice',
      () => ({ anecdotes: ['hidden_gem', 'hidden_gem'].map(answer) }),
      'anecdotes',
    ],
    [
      'a retired question',
      () => ({ anecdotes: ['hidden_gem', retiredQuestion].map(answer) }),
      'anecdotes.1.questionKey',
    ],
    [
      'an unknown question',
      () => ({ anecdotes: [answer('no_such_question')] }),
      'anecdotes.0.questionKey',
    ],
    [
      'four featured routes',
      (own: string[]) => ({ featuredRouteIds: [...own, uuidv7()] }),
      'featuredRouteIds',
    ],
    [
      'a draft route',
      (own: string[], draft: string) => ({ featuredRouteIds: [own[0], draft] }),
      'featuredRouteIds.1',
    ],
    [
      'a route of another author',
      (_: string[], __: string, other: string) => ({ featuredRouteIds: [other] }),
      'featuredRouteIds.0',
    ],
    ['an unknown route', () => ({ featuredRouteIds: [uuidv7()] }), 'featuredRouteIds.0'],
  ] as const)(
    'refuses %s with 422 and writes nothing, the valid fields neither',
    async (_, body, path) => {
      const { headers, userId } = await signIn();
      const own = [
        await createRoute({ authorId: userId }),
        await createRoute({ authorId: userId }),
        await createRoute({ authorId: userId }),
      ];
      const draft = await createRoute({ authorId: userId, status: 'draft' });
      const other = await createRoute({ authorId: (await signIn()).userId });
      await patchMe(headers, {
        bio: 'Avant.',
        anecdotes: [answer('ideal_sunday')],
        featuredRouteIds: own.slice(0, 1),
      });
      const before = await storedProfile(userId);

      const response = await patchMe(headers, {
        neighborhood: 'Paris 11e',
        bio: 'Après.',
        ...body(own, draft, other),
      });
      expect(response.statusCode).toBe(422);
      const error = ApiError.parse(response.json());
      expect(error.code).toBe('validation_error');
      expect(error.details?.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ location: 'body', path })]),
      );
      expect(await storedProfile(userId)).toEqual(before);
    },
  );
});

describe('GET /v1/me, profile', () => {
  it('returns the saved profile, with the label of each question and the title of each route', async () => {
    const { headers, userId } = await signIn();
    const first = await createRoute({ authorId: userId, title: 'Le Marais gourmand' });
    const second = await createRoute({ authorId: userId, title: 'Canal Saint-Martin' });
    const saved = await patchMe(headers, {
      bio: 'Flâneuse du dimanche.',
      neighborhood: 'Paris 11e',
      anecdotes: [
        { questionKey: 'summer_must', answer: 'Les quais de Seine.' },
        { questionKey: 'hidden_gem', answer: 'Un passage couvert.' },
      ],
      featuredRouteIds: [second, first],
    });

    const expected = {
      bio: 'Flâneuse du dimanche.',
      neighborhood: 'Paris 11e',
      anecdotes: [
        {
          questionKey: 'summer_must',
          questionLabel: 'Ce que je ne rate jamais en été',
          answer: 'Les quais de Seine.',
        },
        {
          questionKey: 'hidden_gem',
          questionLabel: 'Un bon plan que personne ne connaît',
          answer: 'Un passage couvert.',
        },
      ],
      featuredRoutes: [
        { id: second, title: 'Canal Saint-Martin' },
        { id: first, title: 'Le Marais gourmand' },
      ],
    };
    expect(Me.parse(saved.json())).toMatchObject(expected);
    expect(await getMe(headers)).toMatchObject(expected);
  });
});

describe('GET /v1/me, featured routes', () => {
  it('never shows a route that left published or changed author, even before its row is deleted', async () => {
    const { headers, userId } = await signIn();
    const kept = await createRoute({ authorId: userId });
    const unpublished = await createRoute({ authorId: userId });
    const handedOver = await createRoute({ authorId: userId });
    await patchMe(headers, { featuredRouteIds: [unpublished, kept, handedOver] });

    await app.db.update(routes).set({ status: 'unpublished' }).where(eq(routes.id, unpublished));
    await app.db
      .update(routes)
      .set({ authorId: (await signIn()).userId })
      .where(eq(routes.id, handedOver));

    expect((await getMe(headers)).featuredRoutes.map((route) => route.id)).toEqual([kept]);
  });
});

describe('GET /v1/me, certification', () => {
  it('lists each criterion with the value of the creator, the threshold and its state', async () => {
    const { headers, userId } = await signIn();
    await createRoute({ authorId: userId, stats: { rating_avg: 5, rating_count: 4 } }, [
      placeIds.verified,
      placeIds.verified,
    ]);
    await createRoute({ authorId: userId, stats: { rating_avg: 4, rating_count: 1 } }, [
      placeIds.verified,
      placeIds.stale,
    ]);
    // Neither a draft nor a route without steps counts.
    await createRoute(
      { authorId: userId, status: 'draft', stats: { rating_avg: 1, rating_count: 9 } },
      [placeIds.verified],
    );
    await createRoute({ authorId: userId });

    expect((await getMe(headers)).certification).toEqual({
      isCertified: false,
      certifiedAt: null,
      criteria: [
        { criterion: 'verifiedRoutes', value: 1, threshold: 3, isMet: false },
        { criterion: 'averageRating', value: 4.8, threshold: 4.5, isMet: true },
        { criterion: 'completedRoutes', value: 0, threshold: 3, isMet: false },
      ],
    });
  });

  it('shows the badge of the nightly computation unless the team overrides it', async () => {
    const { headers, userId } = await signIn();
    const certifiedAt = new Date('2026-09-01T00:00:00.000Z');
    const setBadge = (values: Partial<typeof users.$inferInsert>) =>
      app.db.update(users).set(values).where(eq(users.id, userId));

    await setBadge({ isCertified: true, certifiedAt });
    expect((await getMe(headers)).certification).toMatchObject({
      isCertified: true,
      certifiedAt: certifiedAt.toISOString(),
    });
    await setBadge({ certifiedOverride: 'revoked' });
    expect((await getMe(headers)).certification).toMatchObject({
      isCertified: false,
      certifiedAt: null,
    });
    await setBadge({ isCertified: false, certifiedOverride: 'granted' });
    expect((await getMe(headers)).certification.isCertified).toBe(true);
  });
});

describe('logs of GET and PATCH /v1/me', () => {
  it('contain neither the profile written, nor the one read, nor the refused one', async () => {
    const lines: string[] = [];
    const logged = await build(
      { LOG_LEVEL: 'trace' },
      { logStream: { write: (line) => lines.push(line) } },
    );
    const { headers } = await signIn();
    const inject = (payload: object) =>
      logged.inject({ method: 'PATCH', url: '/v1/me', headers, payload });
    await inject({ bio: 'Bio fictive écrite.', neighborhood: 'Quartier fictif' });
    await logged.inject({ url: '/v1/me', headers });
    await inject({
      bio: 'Bio fictive refusée.',
      anecdotes: [{ questionKey: 'no_such_question', answer: 'Réponse fictive.' }],
    });
    await logged.close();

    const logs = lines.join('');
    for (const leak of ['Bio fictive', 'Quartier fictif', 'Réponse fictive']) {
      expect(logs).not.toContain(leak);
    }
  });
});
