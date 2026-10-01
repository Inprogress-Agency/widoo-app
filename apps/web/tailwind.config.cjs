const tokens = require('@widoo/tokens/tailwind-preset');

const fontStack = 'var(--font-jakarta), system-ui, sans-serif';

/**
 * The text styles of tokens.json (`text-title-xl`, `text-body`…) name the font files of the app
 * (`PlusJakartaSans-800`). On the site the font is loaded once by next/font under
 * `--font-jakarta`: each style keeps its size, line height and spacing, and gets the family and
 * the weight read from the file name. Nothing is written by hand.
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

// Colors, spacings, radii and sizes come from tokens.json only, through the preset shared with
// the app; its text styles are adapted by webTextStyles above.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [{ ...tokens, plugins: [] }],
  plugins: [webTextStyles],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      fontWeight: { medium: '500', extrabold: '800' },
      // Sizes of the site drawn in E-21 and missing from tokens.json: to move there (DESIGN), then
      // remove from here.
      size: { qr: '120px' },
      // Title of the missing page (E-21, D-074): 42/44 on the phone, 64/66 on the computer, tighter
      // by 4 % (measured on the mockups), and the text under it.
      fontSize: {
        'display-m': ['42px', { lineHeight: '44px', letterSpacing: '-1.68px', fontWeight: '800' }],
        'display-xl': ['64px', { lineHeight: '66px', letterSpacing: '-2.56px', fontWeight: '800' }],
        lead: ['17px', { lineHeight: '24px', fontWeight: '500' }],
        'lead-l': ['18px', { lineHeight: '28px', fontWeight: '500' }],
      },
      // Width of the pages, held at the mockups of the computer (1440 px), then the blue frame on
      // the computer (E-21, measured on the mockups): its margin, the width of its column, the
      // photo of a shared route, the text beside the QR code and under the title of the missing
      // page.
      spacing: { frame: '64px' },
      width: { 'frame-column': '540px' },
      maxWidth: {
        page: '1440px',
        'shared-photo': '196px',
        'shared-photo-tablet': '218px',
        'frame-column-tablet': '656px',
        'scan-text': '300px',
        'lost-text': '440px',
      },
      // White border of a step pin on the plan (E-21).
      borderWidth: { pin: '3px' },
      // Blue plan: under the content on the phone and the tablet (measured on E-21), and the
      // least height of the frame on the computer, so that the whole route shows.
      height: { 'plan-phone': '340px', 'plan-tablet': '410px', 'store-badge': '42px' },
      minHeight: { 'plan-frame': '720px' },
      // Plan of E-21 › Mouvement; timings shared with src/config/motion.ts (checked by the tests).
      // Only the start states are in the keyframes: without animation, everything shows.
      keyframes: {
        'plan-draw': { from: { strokeDashoffset: '1' } },
        'plan-pop': { from: { opacity: '0', transform: 'scale(0.9)' } },
        'plan-fade': { from: { opacity: '0' } },
      },
      animation: {
        'plan-draw': 'plan-draw 1800ms linear 300ms both',
        'plan-pop': 'plan-pop 260ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'plan-fade': 'plan-fade 200ms linear both',
      },
    },
  },
};
