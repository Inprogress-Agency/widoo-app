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
  plugins: [
    webTextStyles,
    // `hover-hover:` applies with a mouse only, never after a tap (E-21 › Mouvement).
    ({ addVariant }) => addVariant('hover-hover', '@media (hover: hover)'),
    // « Comment ça marche »: its path draws itself as the page scrolls (E-21 › Mouvement), where
    // the browser ties animations to scrolling; elsewhere it shows drawn.
    ({ addUtilities }) =>
      addUtilities({
        '.animate-draw-on-scroll': {
          '@supports (animation-timeline: view())': {
            animation: 'plan-draw linear both',
            animationTimeline: 'view()',
            animationRange: 'entry 0% cover 55%',
          },
        },
      }),
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      // Bold: the passage in ink of « Comment ça marche » (#237).
      fontWeight: { medium: '500', bold: '700', extrabold: '800' },
      // Sizes of the site drawn in E-21 and missing from tokens.json: to move there (DESIGN), then
      // remove from here.
      // QR code, and the disc of the icon of « Télécharger l'app » on the computer.
      size: { qr: '120px', 'qr-hero': '116px', 'download-disc': '36px' },
      // Title of the missing page (E-21, D-074): 42/44 on the phone, 64/66 on the computer, tighter
      // by 4 % (measured on the mockups), and the text under it.
      fontSize: {
        'display-m': ['42px', { lineHeight: '44px', letterSpacing: '-1.68px', fontWeight: '800' }],
        'display-xl': ['64px', { lineHeight: '66px', letterSpacing: '-2.56px', fontWeight: '800' }],
        lead: ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'lead-l': ['18px', { lineHeight: '28px', fontWeight: '500' }],
        // Title of the hero: same sizes, a little more space between its lines (measured).
        hero: ['42px', { lineHeight: '46px', letterSpacing: '-1.68px', fontWeight: '800' }],
        'hero-l': ['56px', { lineHeight: '64px', letterSpacing: '-2.24px', fontWeight: '800' }],
        'hero-xl': ['64px', { lineHeight: '70px', letterSpacing: '-2.56px', fontWeight: '800' }],
        'lead-xl': ['19px', { lineHeight: '29px', fontWeight: '500' }],
        // Cards laid on the plan of the hero: the quote of a review, the title of the sticker.
        quote: ['15px', { lineHeight: '22px', letterSpacing: '-0.15px', fontWeight: '700' }],
        'sticker-title': ['15px', { lineHeight: '20px', fontWeight: '800' }],
        // « widoo » of the logo in the header: 21 px, 23 px on the computer.
        wordmark: ['21px', { lineHeight: '28px', fontWeight: '800' }],
        'wordmark-l': ['23px', { lineHeight: '28px', fontWeight: '800' }],
        // Sections of the home page (#237): title, 34/38 on the phone, 44/48 on the tablet, 52/56
        // on the computer, tighter by 3.5 %; the text under it; the title of a step and its
        // number. À reporter dans tokens.json.
        'section-title': [
          '34px',
          { lineHeight: '38px', letterSpacing: '-1.19px', fontWeight: '800' },
        ],
        'section-title-l': [
          '44px',
          { lineHeight: '48px', letterSpacing: '-1.54px', fontWeight: '800' },
        ],
        'section-title-xl': [
          '52px',
          { lineHeight: '56px', letterSpacing: '-1.82px', fontWeight: '800' },
        ],
        'lead-m': ['17px', { lineHeight: '26px', fontWeight: '500' }],
        'lead-section-xl': ['19px', { lineHeight: '30px', fontWeight: '500' }],
        'step-title': ['22px', { lineHeight: '28px', letterSpacing: '-0.33px', fontWeight: '800' }],
        'step-title-xl': [
          '24px',
          { lineHeight: '30px', letterSpacing: '-0.36px', fontWeight: '800' },
        ],
        'step-number': ['18px', { lineHeight: '20px', fontWeight: '800' }],
      },
      // Width of the pages, held at the mockups of the computer (1440 px), then the blue frame on
      // the computer (E-21, measured on the mockups): its margin, the width of its column, the
      // photo of a shared route, the text beside the QR code and under the title of the missing
      // page.
      spacing: {
        frame: '64px',
        gutter: '40px',
        // Sections of the home page (#237), measured in the source of the mockups. À reporter dans
        // tokens.json.
        7: '7px',
        14: '14px',
        22: '22px',
        36: '36px',
        48: '48px',
        52: '52px',
        64: '64px',
        72: '72px',
        80: '80px',
        88: '88px',
        96: '96px',
        120: '120px',
      },
      // Hero: the stores as wide as each other, the review and the sticker laid on the plan.
      width: {
        'frame-column': '540px',
        'store-badge-hero': '166px',
        'store-badge-hero-phone': '148px',
        review: '300px',
        // « Télécharger l'app », the same width in every language so that the header never moves.
        'download-button': '200px',
        'download-button-l': '204px',
        sticker: '210px',
        // « Comment ça marche » (#237): a step on the computer, the screenshots of the app in their
        // phone (computer, second step of the computer, tablet, phone). À reporter dans tokens.json.
        'how-step': '364px',
        shot: '250px',
        'shot-s': '232px',
        'shot-tablet': '188px',
        'shot-phone': '196px',
      },
      maxWidth: {
        page: '1440px',
        'shared-photo': '196px',
        'shared-photo-tablet': '218px',
        'frame-column-tablet': '656px',
        'scan-text': '300px',
        'lost-text': '440px',
        // Line of the hero cut as on the mockups: after « prêtes à » on the phone…
        'tagline-phone': '300px',
        // …and on the tablet after « la durée, le ».
        'tagline-tablet': '560px',
        // Sections of the home page (#237): their column on the computer, their title and text, the
        // text of a step of « Comment ça marche ». À reporter dans tokens.json.
        section: '1200px',
        'section-heading': '640px',
        'section-heading-tablet': '580px',
        'how-text': '330px',
      },
      // Shell of the blue frame (E-21, « coque #EDF1FA »): 8 px, 6 px on the phone.
      colors: {
        'frame-shell': '#EDF1FA',
        // Edge of the phone around a screenshot of the app (#237). À reporter dans tokens.json.
        'shot-edge': '#DCE3F2',
      },
      ringWidth: { 5: '5px', 6: '6px' },
      // Shadow of the cards laid on the plan, tinted blue (E-21: rgba(38, 62, 128, 0.18)).
      boxShadow: {
        sticker: '0 12px 28px rgba(38, 62, 128, 0.18)',
        // Phone around a screenshot of the app (#237): phone, tablet, computer. À reporter dans
        // tokens.json.
        'shot-phone': '0 24px 48px rgba(38, 62, 128, 0.18)',
        'shot-tablet': '0 26px 52px rgba(38, 62, 128, 0.18)',
        shot: '0 30px 60px rgba(38, 62, 128, 0.18)',
      },
      // Phone around a screenshot of the app and its screen (#237): computer, second step of the
      // computer, tablet, phone. À reporter dans tokens.json.
      borderRadius: {
        shot: '41px',
        'shot-s': '38px',
        'shot-tablet': '31px',
        'shot-phone': '32px',
        screen: '33px',
        'screen-s': '30px',
        'screen-phone': '25px',
        // Turn of the path of « Comment ça marche » on the tablet: 40 px in the middle of the line.
        'how-path': '45px',
      },
      // Tilt of the cards laid on the plan (measured on E-21).
      rotate: {
        review: '-3deg',
        'review-phone': '-2deg',
        'review-back': '3deg',
        sticker: '4deg',
        // Screenshots of « Comment ça marche », one tilt per step (#237). À reporter dans tokens.json.
        'shot-1': '-2.5deg',
        'shot-1-phone': '-2deg',
        'shot-2': '2deg',
        'shot-3': '-1.5deg',
      },
      // Blue plan: under the content on the phone and the tablet (measured on E-21), and the
      // least height of the frame on the computer, so that the whole route shows.
      height: {
        'plan-phone': '340px',
        'plan-tablet': '410px',
        'plan-hero-phone': '495px',
        'plan-hero-tablet': '527px',
        'sticker-photo': '118px',
        'store-badge': '42px',
        // Header of the site (E-21): 56 px on the phone, 72 on the tablet, 76 on the computer.
        header: '56px',
        'header-tablet': '72px',
        'header-desktop': '76px',
        // « Comment ça marche » (#237): the steps on the computer, the screenshots in their phone
        // (computer, second step of the computer, tablet, phone), the path of the tablet down to
        // under the next section. À reporter dans tokens.json.
        'how-steps': '950px',
        shot: '522px',
        'shot-s': '483px',
        'shot-tablet': '393px',
        'shot-phone': '408px',
        'how-path-tablet': '1388px',
        'how-bar': 'calc(100% + 48px)',
      },
      minHeight: {
        'plan-frame': '720px',
        // Text of a step of « Comment ça marche » on the tablet, so that the screenshots line up.
        'how-text-tablet': '212px',
      },
      // Places of the steps of « Comment ça marche » on the computer (#237), in its 1200 px
      // column. À reporter dans tokens.json.
      // The path of the tablet starts 80 px off the left, its line 22 px from the top, and turns
      // 14 px past the column; on the phone, the line between two numbers.
      inset: {
        'how-2': '430px',
        'how-3': '836px',
        'how-1-top': '40px',
        'how-2-top': '200px',
        'how-3-top': '70px',
        'how-path-left': '-80px',
        'how-path-top': '17px',
        'how-path-right': '-19px',
        'how-bar': '19px',
      },
      // White border of a step pin on the plan (E-21); path of « Comment ça marche » on the tablet
      // (#237, à reporter dans tokens.json).
      borderWidth: { pin: '3px', 'how-path': '10px' },
      // Plan of E-21 › Mouvement; timings shared with src/config/motion.ts (checked by the tests).
      // Only the start states are in the keyframes: without animation, everything shows.
      keyframes: {
        'plan-draw': { from: { strokeDashoffset: '1' } },
        'plan-pop': { from: { opacity: '0', transform: 'scale(0.9)' } },
        'plan-fade': { from: { opacity: '0' } },
        // Hero: the text rises 10 px, the sticker lands, the reviews come in.
        rise: { from: { opacity: '0', transform: 'translateY(10px)' } },
        land: { from: { opacity: '0', scale: '1.08' } },
      },
      // Buttons (E-21 › Mouvement): 0.97 when pressed, in 160 ms; the icon of « Télécharger
      // l'app » moves down 2 px on hover, with a mouse only.
      scale: { press: '0.97' },
      transitionDuration: { press: '160ms' },
      translate: { nudge: '2px' },
      animation: {
        'plan-draw': 'plan-draw 1800ms linear 300ms both',
        'plan-pop': 'plan-pop 260ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'plan-fade': 'plan-fade 200ms linear both',
        rise: 'rise 500ms cubic-bezier(0.23, 1, 0.32, 1) both',
        land: 'land 500ms cubic-bezier(0.23, 1, 0.32, 1) both',
      },
    },
  },
};
