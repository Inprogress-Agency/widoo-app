import { describe, expect, it, vi } from 'vitest';
import { GeocoderUnavailable } from './geocoder';
import { createMapboxGeocoder, ZONE_CACHE_TTL_MS, type UpstreamFailure } from './mapbox';
import { address, cafe, district, neighborhood, station, token } from './mapbox.fixtures';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Answers each API by its path, and keeps the URLs asked. */
function fakeMapbox(answers: { geocoding?: () => Response; searchBox?: () => Response }) {
  const urls: URL[] = [];
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    urls.push(url);
    const answer = url.pathname.includes('/geocode/v6/') ? answers.geocoding : answers.searchBox;
    if (!answer) throw new TypeError('fetch failed');
    return answer();
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, urls };
}

const both = {
  geocoding: () => json({ features: [neighborhood, district, address] }),
  searchBox: () => json({ features: [station, cafe] }),
};

describe('createMapboxGeocoder', () => {
  it('asks both APIs for France in French, biased on Paris, with zone types only', async () => {
    const mapbox = fakeMapbox(both);
    const geocoder = createMapboxGeocoder({ token, isPermanent: false, fetch: mapbox.fetch });
    const zones = await geocoder.find('République');
    expect(zones.map((zone) => zone.id)).toEqual([
      'geo-montmartre',
      'geo-paris-11',
      'poi-republique',
    ]);
    const [geocoding, searchBox] = mapbox.urls;
    expect(Object.fromEntries(geocoding?.searchParams ?? [])).toEqual({
      q: 'République',
      country: 'fr',
      language: 'fr',
      proximity: '2.3522,48.8566',
      types: 'neighborhood,locality,postcode,place',
      limit: '5',
      autocomplete: 'true',
      access_token: token,
    });
    expect(searchBox?.searchParams.get('types')).toBe('poi');
    expect(searchBox?.searchParams.get('country')).toBe('fr');
  });

  it('keeps nothing of temporary results', async () => {
    const mapbox = fakeMapbox(both);
    const geocoder = createMapboxGeocoder({ token, isPermanent: false, fetch: mapbox.fetch });
    await geocoder.find('Montmartre');
    await geocoder.find('Montmartre');
    expect(mapbox.urls.filter((url) => url.pathname.includes('/geocode/v6/'))).toHaveLength(2);
  });

  it('keeps permanent zones 24 hours, per text case aside, and never the stations', async () => {
    let now = 0;
    const mapbox = fakeMapbox(both);
    const geocoder = createMapboxGeocoder({
      token,
      isPermanent: true,
      fetch: mapbox.fetch,
      now: () => now,
    });
    const geocodingCalls = () =>
      mapbox.urls.filter((url) => url.pathname.includes('/geocode/v6/')).length;

    const first = await geocoder.find('Montmartre');
    expect(mapbox.urls[0]?.searchParams.get('permanent')).toBe('true');
    now = ZONE_CACHE_TTL_MS - 1;
    expect(await geocoder.find('  montmartre ')).toEqual(first);
    expect(geocodingCalls()).toBe(1);
    expect(mapbox.urls.filter((url) => url.pathname.includes('/searchbox/'))).toHaveLength(2);

    now = ZONE_CACHE_TTL_MS;
    await geocoder.find('Montmartre');
    expect(geocodingCalls()).toBe(2);
  });

  it('keeps the zones of one API when the other fails, and reports the status only', async () => {
    const failures: UpstreamFailure[] = [];
    const mapbox = fakeMapbox({ ...both, searchBox: () => json({ message: 'Forbidden' }, 403) });
    const geocoder = createMapboxGeocoder({
      token,
      isPermanent: false,
      fetch: mapbox.fetch,
      onFailure: (failure) => failures.push(failure),
    });
    const zones = await geocoder.find('Montmartre');
    expect(zones.map((zone) => zone.kind)).toEqual(['neighborhood', 'district']);
    expect(failures).toEqual([{ source: 'search_box', status: 403 }]);
    expect(JSON.stringify(failures)).not.toContain(token);
  });

  it('throws GeocoderUnavailable when neither API answers', async () => {
    const failures: UpstreamFailure[] = [];
    const mapbox = fakeMapbox({ geocoding: () => json({ nope: true }) });
    const geocoder = createMapboxGeocoder({
      token,
      isPermanent: true,
      fetch: mapbox.fetch,
      onFailure: (failure) => failures.push(failure),
    });
    await expect(geocoder.find('Montmartre')).rejects.toBeInstanceOf(GeocoderUnavailable);
    // In parallel: either may fail first.
    expect(failures).toHaveLength(2);
    expect(failures).toEqual(
      expect.arrayContaining([
        { source: 'geocoding', status: 'invalid' },
        { source: 'search_box', status: 'network' },
      ]),
    );
  });
});
