import { PlaceSearchResult } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { demoPlaceIds, editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';

let app: Awaited<ReturnType<typeof buildApp>>;
const verifier = new TestTokenVerifier();
const fixtures = editorFixtures(() => app, verifier);

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

type Headers = Record<string, string>;

/** Rue de Sévigné, a few metres from the Musée Carnavalet of the demo. */
const near = { lat: 48.85732, lng: 2.36247 };

const search = (headers: Headers, query: string) =>
  app.inject({ url: `/v1/places/search?${query}`, headers });

describe('GET /places/search', () => {
  it('finds a place by a piece of its name, the nearest first, with its distance', async () => {
    const headers = await fixtures.signIn();
    const response = await search(headers, `q=carnavalet&near=${near.lat},${near.lng}`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const { items } = PlaceSearchResult.parse(response.json());
    expect(items[0]).toMatchObject({ id: demoPlaceIds[1], name: 'Musée Carnavalet' });
    expect(items[0]?.distanceM).toBeLessThan(50);
  });

  it('answers a position alone with the nearest places, a text alone without distance', async () => {
    const headers = await fixtures.signIn();
    const byPosition = PlaceSearchResult.parse(
      (await search(headers, `near=${near.lat},${near.lng}&limit=3`)).json(),
    );
    expect(byPosition.items).toHaveLength(3);
    const distances = byPosition.items.map((item) => item.distanceM ?? Infinity);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    const byText = PlaceSearchResult.parse((await search(headers, 'q=carnavalet')).json());
    expect(byText.items[0]?.distanceM).toBeNull();
  });

  it('filters by category', async () => {
    const headers = await fixtures.signIn();
    const { items } = PlaceSearchResult.parse(
      (await search(headers, 'q=carnavalet&category=museum')).json(),
    );
    expect(items.map((item) => item.id)).toContain(demoPlaceIds[1]);
    const none = PlaceSearchResult.parse(
      (await search(headers, 'q=carnavalet&category=bakery')).json(),
    );
    expect(none.items).toEqual([]);
  });

  it('takes % and _ of the text as letters', async () => {
    const headers = await fixtures.signIn();
    const { items } = PlaceSearchResult.parse((await search(headers, 'q=%25%25')).json());
    expect(items).toEqual([]);
  });

  it('refuses a search without text nor position, and an unknown key', async () => {
    const headers = await fixtures.signIn();
    expect((await search(headers, 'category=cafe')).statusCode).toBe(400);
    expect((await search(headers, 'q=ca&near=48,2&city=paris')).statusCode).toBe(400);
  });

  it('refuses an anonymous caller', async () => {
    expect((await search({}, 'q=carnavalet')).statusCode).toBe(401);
  });
});
