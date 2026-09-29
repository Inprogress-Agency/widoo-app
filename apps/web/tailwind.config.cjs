const tokens = require('@widoo/tokens/tailwind-preset');

// Colors, spacings, radii and sizes come from tokens.json only, through the preset shared with
// the app. The text styles of the preset name the font files of the app (`PlusJakartaSans-800`):
// the site loads the font with next/font instead, under the `--font-jakarta` variable.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [tokens],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      fontWeight: { medium: '500', extrabold: '800' },
    },
  },
};
