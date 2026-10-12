const ui = require('@widoo/ui/tailwind-preset');

// Tokens of tokens.json and theme of shadcn/ui, both through the preset of @widoo/ui. The
// components of the package are scanned too, so that their classes are kept.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  presets: [ui],
};
