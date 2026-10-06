/**
 * Zones of the search (Filtres-et-Recherche › Recherche textuelle, D-010) from Mapbox, called by
 * the API alone with its server token: the Geocoding API v6 for neighbourhoods, districts,
 * postcodes and cities, the Search Box API for stations, both limited to France, in French,
 * biased towards Paris, never towards the user. Addresses and points of interest are not asked
 * for, and a point of interest that is not a station is dropped.
 */
import { createTtlCache } from './cache';
import { GeocoderUnavailable, MAX_ZONES, textKey, type Geocoder, type ZoneHit } from './geocoder';
import { stationsOfSearchBox, ZONE_TYPES, zonesOfGeocoding } from './mapbox-answers';
const GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
const SEARCH_BOX_URL = 'https://api.mapbox.com/search/searchbox/v1/forward';

/** The app cuts at 5 s (Ecrans › E-02): Mapbox gets 3, leaving time for the counts. */
const UPSTREAM_TIMEOUT_MS = 3000;

/** Permanent results may be kept: 24 hours (Filtres-et-Recherche › Recherche textuelle). */
export const ZONE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ZONE_CACHE_MAX_ENTRIES = 5000;

/** Paris, where Widoo opens: the bias of the results, the user's position is never sent. */
const PROXIMITY = '2.3522,48.8566';

/** Why a source failed, as it may be logged: never its URL, which holds the token and the text. */
export type UpstreamFailure = {
  source: 'geocoding' | 'search_box';
  status: number | 'timeout' | 'network' | 'invalid';
};

export interface MapboxGeocoderOptions {
  token: string;
  /** Permanent results, which may be cached (`MAPBOX_GEOCODING_PERMANENT`). */
  isPermanent: boolean;
  fetch?: typeof fetch;
  now?: () => number;
  onFailure?: (failure: UpstreamFailure) => void;
}

/**
 * The geocoder of the search. The zones of the Geocoding API are cached 24 hours when permanent;
 * the stations of the Search Box API, temporary only in Mapbox's terms, never are. One source
 * failing leaves the other's zones; both failing throws `GeocoderUnavailable`.
 */
export function createMapboxGeocoder(options: MapboxGeocoderOptions): Geocoder {
  const fetchFn = options.fetch ?? fetch;
  const cache = createTtlCache<ZoneHit[]>({
    ttlMs: ZONE_CACHE_TTL_MS,
    maxEntries: ZONE_CACHE_MAX_ENTRIES,
    now: options.now,
  });

  async function call(
    source: UpstreamFailure['source'],
    url: string,
    params: Record<string, string>,
    read: (body: unknown) => ZoneHit[],
  ): Promise<ZoneHit[]> {
    const query = new URLSearchParams({ ...params, access_token: options.token });
    let response: Response;
    try {
      response = await fetchFn(`${url}?${query.toString()}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      options.onFailure?.({ source, status: isTimeout ? 'timeout' : 'network' });
      throw new GeocoderUnavailable();
    }
    if (!response.ok) {
      options.onFailure?.({ source, status: response.status });
      throw new GeocoderUnavailable();
    }
    try {
      return read(await response.json());
    } catch {
      options.onFailure?.({ source, status: 'invalid' });
      throw new GeocoderUnavailable();
    }
  }

  const common = { country: 'fr', language: 'fr', proximity: PROXIMITY };

  async function zones(text: string): Promise<ZoneHit[]> {
    const key = textKey(text);
    const cached = options.isPermanent ? cache.get(key) : undefined;
    if (cached) {
      return cached;
    }
    const found = await call(
      'geocoding',
      GEOCODING_URL,
      {
        q: text,
        ...common,
        types: ZONE_TYPES,
        limit: '5',
        autocomplete: 'true',
        ...(options.isPermanent && { permanent: 'true' }),
      },
      zonesOfGeocoding,
    );
    if (options.isPermanent) {
      cache.set(key, found);
    }
    return found;
  }

  const stations = (text: string) =>
    call(
      'search_box',
      SEARCH_BOX_URL,
      { q: text, ...common, types: 'poi', limit: '10' },
      stationsOfSearchBox,
    );

  return {
    async find(text) {
      const [fromGeocoding, fromSearchBox] = await Promise.allSettled([
        zones(text),
        stations(text),
      ]);
      if (fromGeocoding.status === 'rejected' && fromSearchBox.status === 'rejected') {
        throw new GeocoderUnavailable();
      }
      const found = [
        ...(fromGeocoding.status === 'fulfilled' ? fromGeocoding.value : []),
        ...(fromSearchBox.status === 'fulfilled' ? fromSearchBox.value : []),
      ];
      const seen = new Set<string>();
      return found
        .filter((zone) => !seen.has(zone.id) && Boolean(seen.add(zone.id)))
        .slice(0, MAX_ZONES);
    },
  };
}
