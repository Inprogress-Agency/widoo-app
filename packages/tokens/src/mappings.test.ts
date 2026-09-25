import { labels, taxonomies } from '@widoo/shared';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMappings, parseUiIcon } from './mappings';
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

describe('parseUiIcon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the weight, the weight when active and the color', () => {
    expect(parseUiIcon('magnifying-glass', theme.colors)).toEqual({ name: 'magnifying-glass' });
    expect(parseUiIcon('plus (bold)', theme.colors)).toEqual({ name: 'plus', weight: 'bold' });
    expect(parseUiIcon('heart (fill quand actif, coral)', theme.colors)).toEqual({
      name: 'heart',
      activeWeight: 'fill',
      color: 'coral',
    });
  });

  it('reads the notes written in French, plein and gras', () => {
    expect(parseUiIcon('door (plein)', theme.colors)).toEqual({ name: 'door', weight: 'fill' });
    expect(parseUiIcon('minus (gras)', theme.colors)).toEqual({ name: 'minus', weight: 'bold' });
    expect(parseUiIcon('house (plein quand actif)', theme.colors)).toEqual({
      name: 'house',
      activeWeight: 'fill',
    });
  });

  it('ignores a note it does not know with a warning, and keeps the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseUiIcon('calendar-check (plein sur une photo)', theme.colors)).toEqual({
      name: 'calendar-check',
    });
    expect(parseUiIcon('heart (fill, pink)', theme.colors)).toEqual({
      name: 'heart',
      weight: 'fill',
    });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('unknown note « pink »'));
  });

  it('still refuses a value that is not « name » or « name (notes) »', () => {
    expect(() => parseUiIcon('Calendar Check', theme.colors)).toThrow('expected « name »');
  });
});

describe('buildMappings', () => {
  it('keys the mood dots by the moods of packages/shared, Nature on its family green (D-016)', () => {
    expect(Object.keys(mappings.moodDots)).toEqual([...taxonomies.moods]);
    expect(mappings.moodDots.nature).toBe('family-nature');
  });

  it('keys the filter icons by technical key, Extérieur on a bench', () => {
    expect(Object.keys(mappings.filterIcons)).toEqual([
      'audiences',
      'budgets',
      'transports',
      'moods',
      'conditions',
    ]);
    expect(mappings.filterIcons.conditions?.outdoor).toBe('park');
    expect(mappings.filterIcons.audiences?.dog_friendly).toBe('paw-print');
  });

  it('gives the chip « Gratuit » its tag, and no other budget an icon (D-053)', () => {
    expect(mappings.filterIcons.budgets).toEqual({ free: 'tag' });
  });

  it.each([
    ['budget', 'budgets'],
    ['duration', 'durations'],
  ] as const)(
    'lists the %s labels of packages/shared, in the order of the taxonomy',
    (group, taxonomy) => {
      const expected = taxonomies[taxonomy].map(
        (key) => (labels.fr[taxonomy] as Record<string, string>)[key],
      );
      expect(tokens.mappings.filterIcons[group]?.map(({ value }) => value)).toEqual(expected);
    },
  );

  it('gives every place category a family and an icon', () => {
    expect(Object.keys(mappings.placeCategories).sort()).toEqual(
      [...taxonomies.placeCategories].sort(),
    );
    expect(mappings.placeCategories.event_venue).toEqual({ family: 'leisure', icon: 'ticket' });
  });

  it('lists every icon once', () => {
    expect(mappings.iconNames).toContain('crown-simple');
    expect(new Set(mappings.iconNames).size).toBe(mappings.iconNames.length);
  });

  it('lists every icon named in the mappings, one-letter names included (#134)', () => {
    // Read in the raw file, sections the schema does not declare included: every value under an
    // `icon` key, in an `icons` group or in `uiIcons` that reads « name » or « name (notes) ». Prose
    // notes (« warning plein ») and color tokens are not icon names; `x` is one, however short.
    const referenced = new Set<string>();
    const visit = (value: unknown, keys: string[]): void => {
      if (typeof value === 'string') {
        const isIconField =
          keys.at(-1) === 'icon' || keys.includes('icons') || keys[0] === 'uiIcons';
        const name = /^([a-z0-9-]+)(?: \(.+\))?$/.exec(value)?.[1];
        if (isIconField && name !== undefined && !(name in theme.colors)) {
          referenced.add(name);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item) => visit(item, keys));
      } else if (value !== null && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
          visit(item, [...keys, key]);
        }
      }
    };
    visit(JSON.parse(readFileSync(tokensPath, 'utf8')).mappings, []);
    expect(referenced).toContain('x');
    expect([...referenced].filter((name) => !mappings.iconNames.includes(name))).toEqual([]);
  });

  it('calls the chevrons and the cross of D-053 by their mapping', () => {
    expect(mappings.uiIcons['open-row']).toEqual({ name: 'caret-right' });
    expect(mappings.uiIcons['collapse-step']).toEqual({ name: 'caret-up' });
    expect(mappings.uiIcons['expand-step']).toEqual({ name: 'caret-down' });
    expect(mappings.uiIcons.remove).toEqual({ name: 'x', weight: 'bold' });
    expect(mappings.uiIcons.close).toEqual({ name: 'x', weight: 'bold' });
  });

  it('reads the press feedback and the haptics of D-030', () => {
    expect(mappings.motion.press).toEqual({
      filledVeil: { color: 'ink', opacity: 0.08 },
      scale: 0.97,
      opacity: 0.6,
    });
    expect(mappings.motion.haptics.favoriteOn).toEqual({
      ios: { method: 'impactAsync', style: 'Light' },
      android: 'Toggle_On',
    });
    expect(mappings.motion.haptics.ratingStar?.ios).toEqual({ method: 'selectionAsync' });
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
      'an icon on a duration, shown as text only',
      withMappings((copy) => {
        copy.filterIcons.duration = (copy.filterIcons.duration ?? []).map((entry) => ({
          ...entry,
          icon: 'clock',
        }));
      }),
      'filterIcons.duration: an icon appeared',
    ],
    [
      'a budget label unknown to packages/shared, even without an icon',
      withMappings((copy) => {
        copy.filterIcons.budget = [{ value: 'Petit budget', icon: null }];
      }),
      '« Petit budget » is not a label of budgets',
    ],
    [
      'a budget value missing',
      withMappings((copy) => {
        copy.filterIcons.budget = [{ value: 'Gratuit', icon: 'tag' }];
      }),
      'filterIcons.budget: missing low, medium, high',
    ],
  ])('refuses %s', (_case, changed, message) => {
    expect(() => buildMappings(changed, theme)).toThrow(message);
  });

  it('accepts an icon on « Gratuit » alone among the budgets, the others staying text (D-053)', () => {
    const changed = withMappings((copy) => {
      copy.filterIcons.budget = (copy.filterIcons.budget ?? []).map((entry) => ({
        ...entry,
        icon: entry.value === 'Gratuit' ? 'tag' : null,
      }));
    });
    expect(buildMappings(changed, theme).filterIcons.budgets).toEqual({ free: 'tag' });
  });
});
