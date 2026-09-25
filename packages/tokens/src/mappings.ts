import { labels, taxonomies, type Taxonomy } from '@widoo/shared';
import type { Tokens } from './schema';
import type { Theme } from './theme';

// `mappings` of tokens.json checked against the theme and packages/shared, then keyed by the
// technical keys the app uses: a label, a family or a token that does not match fails loudly.

export type IconWeight = 'fill' | 'bold';

export type UiIcon = {
  name: string;
  /** Weight of the icon in every state. */
  weight?: IconWeight;
  /** Weight when the control is active (tab, favorite); regular otherwise. */
  activeWeight?: 'fill';
  color?: string;
};

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
  budget: 'budgets',
  transport: 'transports',
  moods: 'moods',
  conditions: 'conditions',
} as const satisfies Record<string, Taxonomy>;

/** Hours are shown as text: this group carries no icon. */
const textOnlyFilters = ['duration'];

/**
 * Amounts are shown as text too, except « Gratuit », the one value with an icon (D-053): in these
 * groups a value may go without an icon. The group appears in the result once a value has one.
 */
const optionalIconFilters = ['budget'];

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
    const values: Record<string, string | null> = {};
    for (const { value, icon } of entries) {
      const key = byLabel.get(value);
      check(key !== undefined, `filterIcons.${group}: « ${value} » is not a label of ${taxonomy}`);
      check(
        icon !== null || optionalIconFilters.includes(group),
        `filterIcons.${group}: « ${value} » has no icon`,
      );
      values[key] = icon;
    }
    checkKeys(taxonomy, values, `filterIcons.${group}`);
    const icons = Object.fromEntries(
      Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== null),
    );
    if (Object.keys(icons).length > 0) {
      result[taxonomy] = icons;
    }
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

// Notes of a `mappings.uiIcons` value, in English or in French as Direction-Artistique writes them.
const weightNotes = new Map<string, IconWeight>([
  ['fill', 'fill'],
  ['plein', 'fill'],
  ['bold', 'bold'],
  ['gras', 'bold'],
]);
const activeWeightNotes = ['fill quand actif', 'plein quand actif'];

/** Read in the run log, and as an annotation of the check when the generator runs in CI. */
function warn(message: string): void {
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${message}` : message);
}

/**
 * « heart (fill quand actif, coral) » → name, weight or weight when active, color token.
 * Grammar: `name` or `name (note, note)`, the name in kebab-case, the notes separated by `, `.
 * A note is `fill` or `plein`, `bold` or `gras`, `fill quand actif` (or `plein quand actif`), or
 * a color token of the theme. Any other note is ignored with a warning: one free word in the
 * wiki must not stop the whole tokens sync (#139).
 */
export function parseUiIcon(value: string, colors: Theme['colors']): UiIcon {
  const match = /^([a-z0-9-]+)(?: \((.+)\))?$/.exec(value);
  check(match?.[1] !== undefined, `ui icon « ${value} »: expected « name » or « name (notes) »`);
  const icon: UiIcon = { name: match[1] };
  for (const note of match[2]?.split(', ') ?? []) {
    const weight = weightNotes.get(note);
    if (weight !== undefined) {
      icon.weight = weight;
    } else if (activeWeightNotes.includes(note)) {
      icon.activeWeight = 'fill';
    } else if (Object.hasOwn(colors, note)) {
      icon.color = note;
    } else {
      warn(
        `ui icon « ${value} »: unknown note « ${note} » ignored (Direction-Artistique › Iconographie)`,
      );
    }
  }
  return icon;
}

/** Press feedback and haptics are written as text in tokens.json: read, or fail loudly. */
function buildMotion({
  durationsMs,
  easings,
  springGesture,
  press,
  scroll,
  haptics,
}: Mappings['motion']) {
  const veil = /^voile ([a-z-]+) à (\d+) %$/.exec(press.filled);
  const scale = /^échelle (\d+,\d+)$/.exec(press.cardsAndDiscs);
  const opacity = /^opacité (\d+,\d+)$/.exec(press.linksAndIcons);
  check(
    veil?.[1] !== undefined && veil[2] !== undefined,
    `motion.press.filled: « ${press.filled} »`,
  );
  check(scale?.[1] !== undefined, `motion.press.cardsAndDiscs: « ${press.cardsAndDiscs} »`);
  check(opacity?.[1] !== undefined, `motion.press.linksAndIcons: « ${press.linksAndIcons} »`);
  const decimal = (value: string) => Number(value.replace(',', '.'));

  const feedback: Record<string, { ios: { method: string; style?: string }; android: string }> = {};
  for (const [name, haptic] of Object.entries(haptics)) {
    if (typeof haptic === 'boolean') {
      continue; // « nothingElse »: a rule, not a feedback
    }
    const call = /^(\w+)\((\w*)\)$/.exec(haptic.ios);
    check(call?.[1] !== undefined, `motion.haptics.${name}.ios: « ${haptic.ios} »`);
    feedback[name] = {
      ios: { method: call[1], ...(call[2] && { style: call[2] }) },
      android: haptic.android,
    };
  }

  return {
    durations: durationsMs,
    easings,
    springGesture,
    press: {
      filledVeil: { color: veil[1], opacity: Number(veil[2]) / 100 },
      scale: decimal(scale[1]),
      opacity: decimal(opacity[1]),
    },
    scroll,
    haptics: feedback,
  };
}

/** Interface icons, badges, toast, immersive page, accessibility and motion. */
function buildInterface(mappings: Mappings, theme: Theme, token: TokenCheck) {
  const uiIcons = Object.fromEntries(
    Object.entries(mappings.uiIcons).map(([key, value]) => [key, parseUiIcon(value, theme.colors)]),
  );

  const badges = Object.fromEntries(
    Object.entries(mappings.badges).map(([kind, badge]) => {
      const where = `badges.${kind}`;
      return [
        kind,
        {
          bg: badge.bg && token('colors', badge.bg, where),
          ink: token('colors', badge.ink, where),
          icon: badge.icon,
          ...(badge.iconColor && { iconColor: token('colors', badge.iconColor, where) }),
          ...(badge.iconStyle && { iconWeight: badge.iconStyle }),
        },
      ];
    }),
  );

  const { toast, immersive } = mappings;
  const { section, miniPlayer } = immersive;
  for (const color of [
    toast.bg,
    toast.title,
    toast.subtitle,
    toast.disc,
    ...Object.values(toast.action),
  ]) {
    token('colors', color, 'toast');
  }
  for (const state of Object.values(toast.states)) {
    token('colors', state.color, 'toast.states');
  }
  for (const color of [
    immersive.bg,
    section.bg,
    section.icon,
    section.link,
    section.ok,
    miniPlayer.bg,
  ]) {
    token('colors', color, 'immersive');
  }
  token('radius', section.radius, 'immersive.section');
  token('radius', miniPlayer.radius, 'immersive.miniPlayer');
  token('shadow', miniPlayer.shadow, 'immersive.miniPlayer');
  token('shadow', toast.shadow, 'toast');

  return {
    uiIcons,
    badges,
    darkSurfaces: mappings.darkSurfaces,
    accessibility: mappings.accessibility,
    toast,
    immersive,
    motion: buildMotion(mappings.motion),
  };
}

export function buildMappings(mappings: Mappings, theme: Theme) {
  const token = tokenCheck(theme);
  const catalog = buildCatalog(mappings, token);
  const ui = buildInterface(mappings, theme, token);
  const icons = [
    ...Object.values(catalog.placeCategories).map((category) => category.icon),
    ...Object.values(catalog.filterIcons).flatMap(Object.values),
    ...Object.values(ui.uiIcons).map((icon) => icon.name),
    ...Object.values(ui.badges).flatMap((badge) => badge.icon ?? []),
    ...Object.values(ui.toast.states).map((state) => state.icon),
  ];
  return { iconNames: [...new Set(icons)].sort(), ...catalog, ...ui };
}
