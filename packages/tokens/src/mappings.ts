import { labels, taxonomies, type Taxonomy } from '@widoo/shared';
import type { Tokens } from './schema';
import type { Theme } from './theme';

// `mappings` of tokens.json checked against the theme and packages/shared, then keyed by the
// technical keys the app uses: a label, a family or a token that does not match fails loudly.

type Mappings = Tokens['mappings'];

function check(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/** Every value of the taxonomy has an entry, and nothing else. */
function checkKeys(taxonomy: Taxonomy, record: Record<string, unknown>, where: string): void {
  const expected: readonly string[] = taxonomies[taxonomy];
  const missing = expected.filter((key) => !(key in record));
  const unknown = Object.keys(record).filter((key) => !expected.includes(key));
  check(missing.length === 0, `${where}: missing ${missing.join(', ')}`);
  check(
    unknown.length === 0,
    `${where}: not in packages/shared ${taxonomy}: ${unknown.join(', ')}`,
  );
}

type TokenCheck = (group: 'colors' | 'radius' | 'shadow', name: string, where: string) => string;

/** Returns the name after checking that the theme has this token. */
function tokenCheck(theme: Theme): TokenCheck {
  return (group, name, where) => {
    check(name in theme[group], `${where}: unknown token « ${name} » in ${group}`);
    return name;
  };
}

// Filter groups of tokens.json and the taxonomy of packages/shared that holds their labels.
const filterTaxonomies = {
  audiences: 'audiences',
  transport: 'transports',
  moods: 'moods',
  conditions: 'conditions',
} as const satisfies Record<string, Taxonomy>;

/** Amounts and hours are shown as text: these groups carry no icon. */
const textOnlyFilters = ['budget', 'duration'];

function buildFilterIcons(filterIcons: Mappings['filterIcons']) {
  const result: Record<string, Record<string, string>> = {};
  for (const [group, entries] of Object.entries(filterIcons)) {
    if (textOnlyFilters.includes(group)) {
      check(
        entries.every((entry) => entry.icon === null),
        `filterIcons.${group}: an icon appeared, map the group to its taxonomy`,
      );
      continue;
    }
    check(group in filterTaxonomies, `filterIcons.${group}: no taxonomy in packages/shared`);
    const taxonomy = filterTaxonomies[group as keyof typeof filterTaxonomies];
    const byLabel = new Map<string, string>(
      Object.entries(labels.fr[taxonomy]).map(([key, label]) => [label, key]),
    );
    const icons: Record<string, string> = {};
    for (const { value, icon } of entries) {
      const key = byLabel.get(value);
      check(key !== undefined, `filterIcons.${group}: « ${value} » is not a label of ${taxonomy}`);
      check(icon !== null, `filterIcons.${group}: « ${value} » has no icon`);
      icons[key] = icon;
    }
    checkKeys(taxonomy, icons, `filterIcons.${group}`);
    result[taxonomy] = icons;
  }
  return result;
}

/** Families, place categories, filters and moods: what the routes and places are made of. */
function buildCatalog(mappings: Mappings, token: TokenCheck) {
  const activityFamilies = Object.fromEntries(
    mappings.activityFamilies.map(({ key, color, chip, moodDot }) => {
      const where = `activityFamilies.${key}`;
      return [
        key,
        {
          color: token('colors', color, where),
          chip: chip && {
            bg: token('colors', chip.bg, where),
            ink: token('colors', chip.ink, where),
          },
          moodDot: moodDot && token('colors', moodDot, where),
        },
      ];
    }),
  );

  const placeCategories = Object.fromEntries(
    mappings.placeCategories.map(({ category, family, icon }) => {
      check(family in activityFamilies, `placeCategories.${category}: no family « ${family} »`);
      return [category, { family, icon }];
    }),
  );
  checkKeys('placeCategories', placeCategories, 'placeCategories');

  const moodDots = Object.fromEntries(
    mappings.moodDots.map(({ mood, dot }) => [mood, token('colors', dot, `moodDots.${mood}`)]),
  );
  checkKeys('moods', moodDots, 'moodDots');

  return {
    activityFamilies,
    placeCategories,
    filterIcons: buildFilterIcons(mappings.filterIcons),
    moodDots,
  };
}

export function buildMappings(mappings: Mappings, theme: Theme) {
  const catalog = buildCatalog(mappings, tokenCheck(theme));
  const icons = [
    ...Object.values(catalog.placeCategories).map((category) => category.icon),
    ...Object.values(catalog.filterIcons).flatMap(Object.values),
  ];
  return { iconNames: [...new Set(icons)].sort(), ...catalog };
}
