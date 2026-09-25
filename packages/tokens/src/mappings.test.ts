import { taxonomies } from '@widoo/shared';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMappings } from './mappings';
import { tokensPath } from './paths';
import { tokensSchema, type Tokens } from './schema';
import { buildTheme } from './theme';

const tokens = tokensSchema.parse(JSON.parse(readFileSync(tokensPath, 'utf8')));
const theme = buildTheme(tokens);
const mappings = buildMappings(tokens.mappings, theme);

/** Copy of the mappings with one change, to check that the generator refuses it. */
function withMappings(change: (copy: Tokens['mappings']) => void): Tokens['mappings'] {
  const copy = structuredClone(tokens.mappings);
  change(copy);
  return copy;
}

describe('buildMappings', () => {
  it('keys the mood dots by the moods of packages/shared, Nature on its family green (D-016)', () => {
    expect(Object.keys(mappings.moodDots)).toEqual([...taxonomies.moods]);
    expect(mappings.moodDots.nature).toBe('family-nature');
  });

  it('keys the filter icons by technical key, Extérieur on a bench', () => {
    expect(Object.keys(mappings.filterIcons)).toEqual([
      'audiences',
      'transports',
      'moods',
      'conditions',
    ]);
    expect(mappings.filterIcons.conditions?.outdoor).toBe('park');
    expect(mappings.filterIcons.audiences?.dog_friendly).toBe('paw-print');
  });

  it('gives every place category a family and an icon', () => {
    expect(Object.keys(mappings.placeCategories).sort()).toEqual(
      [...taxonomies.placeCategories].sort(),
    );
    expect(mappings.placeCategories.event_venue).toEqual({ family: 'leisure', icon: 'ticket' });
  });

  it('lists every icon once', () => {
    expect(mappings.iconNames).toContain('fork-knife');
    expect(new Set(mappings.iconNames).size).toBe(mappings.iconNames.length);
  });

  it.each([
    [
      'a place category missing',
      withMappings((copy) => copy.placeCategories.pop()),
      'placeCategories: missing',
    ],
    [
      'an unknown color token',
      withMappings((copy) => {
        copy.moodDots[0] = { mood: 'culture', dot: 'pink' };
      }),
      'unknown token « pink »',
    ],
    [
      'a filter label unknown to packages/shared',
      withMappings((copy) => {
        copy.filterIcons.audiences = [{ value: 'Seul', icon: 'user' }];
      }),
      '« Seul » is not a label of audiences',
    ],
    [
      'an icon on a text-only filter',
      withMappings((copy) => {
        copy.filterIcons.budget = [{ value: 'Gratuit', icon: 'coins' }];
      }),
      'filterIcons.budget',
    ],
  ])('refuses %s', (_case, changed, message) => {
    expect(() => buildMappings(changed, theme)).toThrow(message);
  });
});
