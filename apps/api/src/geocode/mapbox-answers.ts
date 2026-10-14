/**
 * Zones read from the answers of Mapbox (Filtres-et-Recherche › Recherche textuelle, D-010):
 * neighbourhoods, districts, postcodes and cities of the Geocoding API v6, stations of the Search
 * Box API. An address, or a point of interest that is not a station, is not a zone: dropped, as is
 * any feature of an unexpected shape. Mapbox names the zones in the language asked; the
 * arrondissements are labelled here, in the same language, from their number.
 */
import {
  arrondissementLabel,
  type AppLocale,
  type GeoBox,
  type GeocodeZoneKind,
} from '@widoo/shared';
import { z } from 'zod';
import type { ZoneHit } from './geocoder';

/** Zone types of the Geocoding API v6; `street`, `address` and the others are not asked for. */
export const ZONE_TYPES = 'neighborhood,locality,postcode,place';

/**
 * Categories of the Search Box API that make a station, and the Maki icons of the stations: a
 * point of interest with neither is not a zone.
 */
const STATION_CATEGORIES = new Set([
  'subway_station',
  'metro_station',
  'train_station',
  'railway_station',
  'light_rail_station',
  'tram_station',
]);
const STATION_ICONS = new Set(['rail', 'rail-metro', 'rail-light']);

const Named = z.object({ name: z.string().min(1) }).optional();
const Context = z
  .object({ place: Named, locality: Named, region: Named, postcode: Named })
  .partial()
  .optional();
const Coordinates = z.object({ longitude: z.number(), latitude: z.number() });

const GeocodingFeature = z.object({
  properties: z.object({
    mapbox_id: z.string().min(1),
    feature_type: z.enum(['neighborhood', 'locality', 'postcode', 'place']),
    name: z.string().min(1),
    coordinates: Coordinates,
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    context: Context,
  }),
});

const SearchBoxFeature = z.object({
  properties: z.object({
    mapbox_id: z.string().min(1),
    feature_type: z.literal('poi'),
    name: z.string().min(1),
    coordinates: Coordinates,
    poi_category_ids: z.array(z.string()).optional(),
    maki: z.string().optional(),
    context: Context,
  }),
});

const Features = z.object({ features: z.array(z.unknown()) });

const isArrondissement = (name: string) => /arrondissement/i.test(name);

/**
 * Short label of the locality of an arrondissement, in the language asked: « 11e arrondissement »
 * or « 11th Arrondissement » → « 11e » or « 11th », from its number whatever Mapbox wrote around
 * it; a name without number loses « arrondissement » only.
 */
function shortArea(name: string, locale: AppLocale): string {
  const number = Number(name.match(/\d{1,2}/)?.[0]);
  if (number >= 1 && number <= 20) {
    return arrondissementLabel(number, locale);
  }
  return name.replace(/\s+arrondissement$/i, '').trim();
}

/** An arrondissement of Paris from its postcode, 75001 to 75020 (75116 is the 16e). */
function parisDistrictOf(postcode: string | undefined, locale: AppLocale): string | null {
  const match = postcode?.match(/^75(?:0(\d{2})|1(16))$/);
  const number = Number(match?.[1] ?? match?.[2]?.slice(1));
  if (!match || number < 1 || number > 20) {
    return null;
  }
  return `Paris ${arrondissementLabel(number, locale)}`;
}

/** « Paris 18e »: the city and the arrondissement, from the locality or else the postcode. */
function districtArea(context: Context, locale: AppLocale): string | null {
  const locality = context?.locality?.name;
  const place = context?.place?.name;
  if (locality && isArrondissement(locality)) {
    const short = shortArea(locality, locale);
    return place ? `${place} ${short}` : short;
  }
  return place === 'Paris' ? parisDistrictOf(context?.postcode?.name, locale) : null;
}

/** Kind of zone of a feature type of the Geocoding API. */
function kindOf(featureType: z.infer<typeof GeocodingFeature>['properties']['feature_type']) {
  const kinds: Record<typeof featureType, GeocodeZoneKind> = {
    neighborhood: 'neighborhood',
    locality: 'district',
    postcode: 'postcode',
    place: 'city',
  };
  return kinds[featureType];
}

function envelopeOf(bbox: [number, number, number, number] | undefined): GeoBox | null {
  if (!bbox) {
    return null;
  }
  const [west, south, east, north] = bbox;
  return west < east && south < north ? { west, south, east, north } : null;
}

type Context = z.infer<typeof Context>;

/** Where a zone lies: its district, else its city, else its region. */
function areaOf(kind: GeocodeZoneKind, context: Context, locale: AppLocale): string | null {
  const place = context?.place?.name ?? null;
  if (kind === 'district' || kind === 'city') {
    return kind === 'district' ? place : (context?.region?.name ?? null);
  }
  return districtArea(context, locale) ?? place;
}

/** Zones of a Geocoding API answer, asked in `locale`; a feature of another shape is dropped. */
export function zonesOfGeocoding(body: unknown, locale: AppLocale): ZoneHit[] {
  return Features.parse(body).features.flatMap((raw) => {
    const feature = GeocodingFeature.safeParse(raw);
    if (!feature.success) {
      return [];
    }
    const { properties: p } = feature.data;
    // A locality of a city with districts is its arrondissement; any other, a neighbourhood.
    const isOtherLocality = p.feature_type === 'locality' && !isArrondissement(p.name);
    const kind = isOtherLocality ? 'neighborhood' : kindOf(p.feature_type);
    return [
      {
        id: p.mapbox_id,
        name:
          kind === 'district' && p.context?.place?.name
            ? `${p.context.place.name} ${shortArea(p.name, locale)}`
            : p.name,
        kind,
        area: areaOf(kind, p.context, locale),
        center: { lat: p.coordinates.latitude, lng: p.coordinates.longitude },
        envelope: envelopeOf(p.bbox),
      },
    ];
  });
}

/** Stations of a Search Box API answer, asked in `locale`: any other point of interest is dropped. */
export function stationsOfSearchBox(body: unknown, locale: AppLocale): ZoneHit[] {
  return Features.parse(body).features.flatMap((raw) => {
    const feature = SearchBoxFeature.safeParse(raw);
    if (!feature.success) {
      return [];
    }
    const { properties: p } = feature.data;
    const isStation =
      (p.poi_category_ids ?? []).some((category) => STATION_CATEGORIES.has(category)) ||
      (p.maki !== undefined && STATION_ICONS.has(p.maki));
    if (!isStation) {
      return [];
    }
    return [
      {
        id: p.mapbox_id,
        name: p.name,
        kind: 'station' as const,
        area: areaOf('station', p.context, locale),
        center: { lat: p.coordinates.latitude, lng: p.coordinates.longitude },
        envelope: null,
      },
    ];
  });
}

/** Words of a name or a text, case, accents and « St » aside: « Canal St. Martin » → canal, saint, martin. */
function wordsOf(text: string): string[] {
  const abbreviations: Record<string, string> = { st: 'saint', ste: 'sainte' };
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('fr')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => abbreviations[word] ?? word);
}

/**
 * The zone is named by the text: each word typed starts a word of its name. Mapbox matches
 * loosely, « 12 rue de Rivoli » giving « Le Tivoli » and « Tour Eiffel » the neighbourhood
 * « Eiffel » of Levallois: an address or a point of interest then proposes no zone (D-010).
 */
export function namesText(name: string, text: string): boolean {
  const nameWords = wordsOf(name);
  return wordsOf(text).every((typed) => nameWords.some((word) => word.startsWith(typed)));
}
