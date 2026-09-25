const nativewind = require('nativewind/preset');
const tokens = require('@widoo/tokens/tailwind-preset');

// NativeWind's preset brings the plugins that turn classes into React Native styles, and extends
// the theme with system fonts, shadows and letter spacings: its theme is dropped, only the tokens
// of @widoo/tokens remain. NativeWind checks the `nativewind` flag of its preset.
const nativewindPlugins = Object.assign(() => ({ ...nativewind(), theme: {} }), {
  nativewind: true,
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [nativewindPlugins, tokens],
};
