import type { Tokens } from './schema';
import { buildTheme, type Theme } from './theme';

const header = (version: number) =>
  `// Généré depuis tokens.json (version ${version}), ne pas modifier : pnpm --filter @widoo/tokens generate.`;

const json = (value: unknown) => JSON.stringify(value, null, 2);

/** `space-16` → `16`: the utility already names the scale (`p-16`, `rounded-card`). */
function withoutPrefix(values: Record<string, number>, prefix: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name.replace(prefix, ''), `${value}px`]),
  );
}

/**
 * Tailwind preset for NativeWind. It replaces the default palette and scales rather than
 * extending them: a class outside the tokens does not exist. Text styles are utilities that set
 * the font file of their weight. No shadow class: NativeWind would turn it into an Android
 * elevation unlike the mock-ups, the app sets the token as a native `boxShadow` style.
 */
export function renderPreset(tokens: Tokens, theme: Theme = buildTheme(tokens)): string {
  const spacing = withoutPrefix(theme.spacing, 'space-');
  const sizes = { ...spacing, ...withoutPrefix(theme.size, ''), full: '100%', auto: 'auto' };
  const textUtilities = Object.fromEntries(
    Object.entries(theme.textStyles).map(([name, style]) => [
      `.text-${name}`,
      {
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        lineHeight: `${style.lineHeight}px`,
        ...(style.letterSpacing !== undefined && { letterSpacing: `${style.letterSpacing}px` }),
        ...(style.textTransform && { textTransform: style.textTransform }),
      },
    ]),
  );
  const presetTheme = {
    colors: theme.colors,
    spacing,
    borderRadius: withoutPrefix(theme.radius, 'radius-'),
    width: sizes,
    minWidth: sizes,
    maxWidth: sizes,
    height: sizes,
    minHeight: sizes,
    maxHeight: sizes,
    size: sizes,
    boxShadow: {},
    fontFamily: {},
    fontSize: {},
    fontWeight: {},
    lineHeight: {},
    letterSpacing: {},
  };
  return `${header(tokens.version)}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: ${json(presetTheme).replaceAll('\n', '\n  ')},
  plugins: [
    function textStyles({ addUtilities }) {
      addUtilities(${json(textUtilities).replaceAll('\n', '\n      ')});
    },
  ],
};
`;
}

type Declaration = {
  name: string;
  value: unknown;
  comment: string;
  type?: string;
};

/** Typed module of the theme, for components and the rare StyleSheet. */
export function renderThemeModule(tokens: Tokens, theme: Theme = buildTheme(tokens)): string {
  const declarations: Declaration[] = [
    {
      name: 'colors',
      value: theme.colors,
      comment: 'Light theme: the dark values are not validated and not generated.',
      type: 'ColorToken',
    },
    {
      name: 'fontFamilies',
      value: theme.fontFamilies,
      comment: 'Font file of each weight, loaded under this name.',
      type: 'FontWeight',
    },
    {
      name: 'textStyles',
      value: theme.textStyles,
      comment: 'The 20 text styles, in points.',
      type: 'TextStyleToken',
    },
    { name: 'spacing', value: theme.spacing, comment: 'Spacings in points.', type: 'SpacingToken' },
    { name: 'radius', value: theme.radius, comment: 'Radii in points.', type: 'RadiusToken' },
    { name: 'size', value: theme.size, comment: 'Component sizes in points.', type: 'SizeToken' },
    {
      name: 'shadow',
      value: theme.shadow,
      comment: 'The only shadow, for the native `boxShadow` style.',
      type: 'ShadowToken',
    },
  ];

  const body = declarations.map(({ name, value, comment, type }) => {
    const constant = `/** ${comment} */\nexport const ${name} = ${json(value)} as const;`;
    return type ? `${constant}\nexport type ${type} = keyof typeof ${name};` : constant;
  });

  return `${header(tokens.version)}
export const tokensVersion = ${tokens.version};

${body.join('\n\n')}
`;
}
