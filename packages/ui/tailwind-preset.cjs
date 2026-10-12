const tokens = require('@widoo/tokens/tailwind-preset');
const { shadcnColorTokens, shadcnRadiusToken } = require('./shadcn-theme.cjs');

const fontStack = 'var(--font-jakarta), system-ui, sans-serif';

/**
 * The text styles of tokens.json (`text-title-l`, `text-body-s`…) name the font files of the app
 * (`PlusJakartaSans-800`). On the web the font is loaded once by next/font under
 * `--font-jakarta`: each style keeps its size, line height and spacing, and gets the family and
 * the weight read from the file name. Same adaptation as the site (apps/web).
 */
const webTextStyles = ({ addUtilities }) => {
  for (const plugin of tokens.plugins) {
    plugin({
      addUtilities: (utilities) =>
        addUtilities(
          Object.fromEntries(
            Object.entries(utilities).map(([name, style]) => {
              const weight = /^PlusJakartaSans-(\d{3})$/.exec(style.fontFamily ?? '')?.[1];
              return [
                name,
                weight ? { ...style, fontFamily: fontStack, fontWeight: weight } : style,
              ];
            }),
          ),
        ),
    });
  }
};

/** `--background`, `--primary`… on `:root`, each with the value of its token, and `--radius`. */
const shadcnVariables = ({ addBase }) =>
  addBase({
    ':root': {
      ...Object.fromEntries(
        Object.entries(shadcnColorTokens).map(([variable, token]) => [
          `--${variable}`,
          tokens.theme.colors[token],
        ]),
      ),
      '--radius': tokens.theme.borderRadius[shadcnRadiusToken],
    },
  });

/**
 * Focus of the keyboard on every focusable element (wiki Ecrans › Admin web, Accessibilité): ink
 * ring of 3 px, 3 px away, the same as the site.
 */
const focusRing = ({ addBase, theme }) =>
  addBase({
    ':focus-visible': { outline: `3px solid ${theme('colors.ring')}`, outlineOffset: '3px' },
  });

/**
 * States that Radix writes as data attributes, as variants: `highlighted:` for the entry of a
 * menu under the pointer or the keyboard, `state-open:` for an open trigger.
 */
const radixStates = ({ addVariant }) => {
  addVariant('highlighted', '&[data-highlighted]');
  addVariant('state-open', '&[data-state="open"]');
};

/**
 * Tailwind preset of the web interfaces of Widoo: the tokens of tokens.json (colors, spacings,
 * radii, sizes, text styles), then the theme of shadcn/ui read from them. An app adds its own
 * `content`, with `../../packages/ui/src` so that the classes of the components are kept.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  presets: [{ ...tokens, plugins: [] }],
  plugins: [webTextStyles, shadcnVariables, focusRing, radixStates],
  theme: {
    extend: {
      colors: Object.fromEntries(
        Object.keys(shadcnColorTokens).map((variable) => [variable, `var(--${variable})`]),
      ),
      fontFamily: { sans: [fontStack] },
      fontWeight: { medium: '500', semibold: '600', bold: '700', extrabold: '800' },
      // Sizes of the admin drawn on the reference boards (wiki Ecrans › Admin web, « Formes et
      // tailles », « Navigation », « En-tête », A-01) and missing from tokens.json: to move there
      // (DESIGN), then remove from here.
      height: { header: '64px', screen: '100dvh' },
      minHeight: { field: '40px', screen: '100dvh' },
      minWidth: { 0: '0px' },
      width: { sidebar: '248px', 'sidebar-icons': '72px' },
      maxWidth: { 'sign-in': '440px' },
      // Text of a button of 36 px and of a navigation entry: `body-s` in 700.
      fontSize: { control: ['14px', { lineHeight: '20px', fontWeight: '700' }] },
      // What floats above the content (menu, tooltip, toast): the only shadow of tokens.json
      // (`shadow-tabbar`), which the preset of the tokens does not expose yet.
      boxShadow: { floating: '0 8px 24px rgba(20, 23, 31, 0.10)' },
    },
  },
};
