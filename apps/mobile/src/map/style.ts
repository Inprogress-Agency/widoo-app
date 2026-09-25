import { colors, textStyles } from '@widoo/tokens';

/**
 * Map style of Direction-Artistique › Carte, built from the `map-*` colors of tokens.json over
 * the Mapbox Streets tiles: light base, soft water and parks, white roads, neighbourhood names
 * in capitals, no third-party point of interest and no street name.
 */

// Mapbox serves its own fonts only: Plus Jakarta Sans would have to be uploaded to the account.
const labelFont = ['DIN Pro Bold', 'Arial Unicode MS Bold'];

const label = textStyles['map-label'];

/** Road width in points by zoom: minor streets stay thin, avenues read from afar. */
const roadWidth = (minor: number, major: number) => [
  'interpolate',
  ['exponential', 1.5],
  ['zoom'],
  12,
  ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], major / 4, minor / 4],
  18,
  ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], major, minor],
];

/** A layer of the Mapbox style specification, as far as this style uses it. */
interface StyleLayer {
  id: string;
  type: 'background' | 'fill' | 'line' | 'symbol';
  source?: string;
  'source-layer'?: string;
  filter?: unknown[];
  minzoom?: number;
  layout?: Record<string, unknown>;
  paint: Record<string, unknown>;
}

const layers: StyleLayer[] = [
  { id: 'base', type: 'background', paint: { 'background-color': colors['map-base'] } },
  {
    id: 'parks',
    type: 'fill',
    source: 'streets',
    'source-layer': 'landuse',
    filter: [
      'match',
      ['get', 'class'],
      ['park', 'grass', 'pitch', 'cemetery', 'wood'],
      true,
      false,
    ],
    paint: { 'fill-color': colors['map-park'] },
  },
  {
    id: 'water',
    type: 'fill',
    source: 'streets',
    'source-layer': 'water',
    paint: { 'fill-color': colors['map-water'] },
  },
  {
    id: 'waterways',
    type: 'line',
    source: 'streets',
    'source-layer': 'waterway',
    paint: { 'line-color': colors['map-water'], 'line-width': roadWidth(2, 6) },
  },
  {
    id: 'blocks',
    type: 'fill',
    source: 'streets',
    'source-layer': 'building',
    minzoom: 14,
    paint: { 'fill-color': colors['map-block'] },
  },
  {
    id: 'roads',
    type: 'line',
    source: 'streets',
    'source-layer': 'road',
    filter: [
      '!',
      ['match', ['get', 'class'], ['path', 'track', 'ferry', 'aerialway'], true, false],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colors['map-road'], 'line-width': roadWidth(10, 22) },
  },
  {
    id: 'neighbourhoods',
    type: 'symbol',
    source: 'streets',
    'source-layer': 'place_label',
    filter: ['==', ['get', 'class'], 'settlement_subdivision'],
    layout: {
      'text-field': ['coalesce', ['get', 'name_fr'], ['get', 'name']],
      'text-font': labelFont,
      'text-size': label.fontSize,
      'text-letter-spacing': label.letterSpacing / label.fontSize,
      'text-transform': 'uppercase',
      'text-max-width': 8,
    },
    paint: { 'text-color': colors['map-label'] },
  },
];

export const mapStyle = {
  version: 8,
  name: 'Widoo',
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  sources: { streets: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' } },
  layers,
};

/** The style as the map view takes it. */
export const mapStyleJson = JSON.stringify(mapStyle);
