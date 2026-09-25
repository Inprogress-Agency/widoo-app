import { colors } from '@widoo/tokens';
import { describe, expect, it } from 'vitest';
import { mapStyle } from './style';

const mapColors: unknown[] = Object.entries(colors)
  .filter(([name]) => name.startsWith('map-'))
  .map(([, value]) => value);

describe('mapStyle', () => {
  it('paints with the map-* colors of tokens.json only', () => {
    const painted = mapStyle.layers.flatMap((layer) =>
      Object.entries(layer.paint)
        .filter(([property]) => property.endsWith('-color'))
        .map(([, value]) => value),
    );
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.every((value) => mapColors.includes(value))).toBe(true);
  });

  it('shows no point of interest and no street name, only neighbourhoods in capitals', () => {
    const labels = mapStyle.layers.filter((layer) => layer.type === 'symbol');
    expect(labels.map((layer) => layer['source-layer'])).toEqual(['place_label']);
    expect(labels[0]?.layout?.['text-transform']).toBe('uppercase');
    expect(mapStyle.layers.some((layer) => layer['source-layer'] === 'poi_label')).toBe(false);
  });
});
