const tokens = require('@widoo/tokens/tailwind-preset');

const fontStack = 'var(--font-jakarta), system-ui, sans-serif';

/**
 * « Quartiers » on the computer (E-21, #237): place of each card and of the names of the banks on
 * the plan of Paris, [left, top] in px, from the source of the mockups. À reporter dans
 * tokens.json.
 */
const districtPlaces = {
  montmartre: [420, 36],
  buttesChaumont: [842, 64],
  canalSaintMartin: [712, 196],
  passages: [248, 214],
  marais: [560, 318],
  saintGermain: [284, 510],
  latinQuarter: [660, 500],
  'bank-right': [960, 392],
  'bank-left': [1000, 522],
};

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
    // « Quartiers »: `place-<district>` lays a card or the name of a bank on the plan of Paris.
    ({ addUtilities }) =>
      addUtilities(
        Object.fromEntries(
          Object.entries(districtPlaces).map(([name, [left, top]]) => [
            `.place-${name}`,
            { position: 'absolute', left: `${left}px`, top: `${top}px` },
          ]),
        ),
      ),
    // « Questions fréquentes » (E-21 › Mouvement, #238): `faq-item` on a `details`, the answer opens
    // in height and opacity in 220 ms where the browser animates `details`, at once elsewhere;
    // with « Réduire les animations », a fade only.
    ({ addBase, addComponents }) => {
      addBase({ ':root': { interpolateSize: 'allow-keywords' } });
      addComponents({
        '.faq-item summary::-webkit-details-marker': { display: 'none' },
        '.faq-item::details-content': {
          blockSize: '0',
          opacity: '0',
          overflow: 'clip',
          transition:
            'block-size 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 220ms cubic-bezier(0.23, 1, 0.32, 1), content-visibility 220ms allow-discrete',
        },
        '.faq-item[open]::details-content': { blockSize: 'auto', opacity: '1' },
        '@media (prefers-reduced-motion: reduce)': {
          '.faq-item::details-content': {
            transition: 'opacity 200ms ease, content-visibility 200ms allow-discrete',
          },
        },
      });
    },
    // Gradient of the W of the logo (final banner, #238): `stop-w-light-start`, `stop-w-light-end`.
    ({ addUtilities, theme }) =>
      addUtilities({
        '.stop-w-light-start': { stopColor: theme('colors.w-light-start') },
        '.stop-w-light-end': { stopColor: theme('colors.w-light-end') },
      }),
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
      // QR code, and the disc of the icon of « Télécharger l'app » on the computer; stars of a
      // rating on a photo and the logo of Widoo beside an example route (#237, à reporter dans
      // tokens.json).
      size: {
        qr: '120px',
        'qr-hero': '116px',
        'download-disc': '36px',
        star: '13px',
        'star-l': '15px',
        'credit-logo': '28px',
        // « Quartiers » (#237): photo or icon of a district, on the phone and the tablet then on
        // the computer, and its icon.
        'district-thumb': '52px',
        'district-thumb-xl': '60px',
        'district-icon': '26px',
        // « Questions fréquentes » (#238): the disc of + and −, the envelope of the contact.
        'faq-icon': '36px',
        'contact-icon': '18px',
      },
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
        // « widoo » of the logo in the header: 22/25, 24/28 on the computer, tighter by 3 % (source
        // of the mockups).
        wordmark: ['22px', { lineHeight: '25px', letterSpacing: '-0.66px', fontWeight: '800' }],
        'wordmark-l': ['24px', { lineHeight: '28px', letterSpacing: '-0.72px', fontWeight: '800' }],
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
        // « Envies » (#237): title of the large card on the computer, rating on a photo, creator
        // of an example route. À reporter dans tokens.json.
        'idea-title-xl': [
          '28px',
          { lineHeight: '34px', letterSpacing: '-0.56px', fontWeight: '800' },
        ],
        'rating-value': ['13px', { lineHeight: '18px', fontWeight: '800' }],
        'rating-value-l': ['15px', { lineHeight: '18px', fontWeight: '800' }],
        'credit-title': ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'credit-initial': ['11px', { lineHeight: '12px', fontWeight: '800' }],
        // « Quartiers » (#237): « Rive droite », « Rive gauche ». À reporter dans tokens.json.
        'bank-label': ['12px', { lineHeight: '16px', letterSpacing: '1.68px', fontWeight: '800' }],
        // `body-medium` and `label` in 600, as on the mockups: the links of the header, the other
        // language, the names of the steps on the plan. À reporter dans tokens.json.
        'body-semibold': ['15px', { lineHeight: '20px', fontWeight: '600' }],
        'label-semibold': ['13px', { lineHeight: '18px', fontWeight: '600' }],
        // « Questions fréquentes » (#238): a question (17/23 on the phone), its answer, the title
        // and the text of « Une autre question ? ». À reporter dans tokens.json.
        'faq-question': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        'faq-question-phone': ['17px', { lineHeight: '23px', fontWeight: '700' }],
        'faq-answer': ['16px', { lineHeight: '26px', fontWeight: '500' }],
        'contact-title': [
          '19px',
          { lineHeight: '24px', letterSpacing: '-0.19px', fontWeight: '800' },
        ],
        'body-m': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        // Title of the final banner (#238): 30/34 on the phone, 40/44 on the tablet (52/56 on the
        // computer, as the sections). À reporter dans tokens.json.
        'banner-title': [
          '30px',
          { lineHeight: '34px', letterSpacing: '-1.05px', fontWeight: '800' },
        ],
        'banner-title-l': [
          '40px',
          { lineHeight: '44px', letterSpacing: '-1.4px', fontWeight: '800' },
        ],
        // Footer (#238): « widoo », its links (15/44 on the phone, a line as high as a touch), the
        // other language. À reporter dans tokens.json.
        'wordmark-s': ['20px', { lineHeight: '23px', letterSpacing: '-0.6px', fontWeight: '800' }],
        'link-s': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'footer-link-phone': ['15px', { lineHeight: '44px', fontWeight: '600' }],
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
        2: '2px',
        7: '7px',
        // Between the icon and « widoo » in the header, on the phone and the tablet.
        9: '9px',
        14: '14px',
        22: '22px',
        36: '36px',
        44: '44px',
        48: '48px',
        52: '52px',
        56: '56px',
        64: '64px',
        72: '72px',
        80: '80px',
        88: '88px',
        96: '96px',
        112: '112px',
        120: '120px',
        128: '128px',
        // Final banner on the phone (#238): its text under the W.
        250: '250px',
      },
      // Hero: the stores as wide as each other, the review and the sticker laid on the plan.
      width: {
        'frame-column': '540px',
        'store-badge-hero': '166px',
        'store-badge-hero-phone': '148px',
        // Final banner (#238): the stores, 150 px side by side on the phone, 169 px stacked from
        // the tablet; its text on the tablet and the computer. À reporter dans tokens.json.
        'store-badge-banner-phone': '150px',
        'store-badge-banner': '169px',
        'banner-text-tablet': '360px',
        'banner-text': '520px',
        review: '300px',
        // « Télécharger l'app », the same width in every language so that the header never moves.
        'download-button': '198px',
        'download-button-l': '202px',
        sticker: '210px',
        // « Comment ça marche » (#237): a step on the computer, the screenshots of the app in their
        // phone (computer, second step of the computer, tablet, phone). À reporter dans tokens.json.
        'how-step': '364px',
        shot: '250px',
        'shot-s': '232px',
        'shot-tablet': '188px',
        'shot-phone': '196px',
        // A card of « Quartiers » (#237): on the tablet, then on the computer, wider for the long
        // names. À reporter dans tokens.json.
        'district-tablet': '324px',
        district: '300px',
        'district-wide': '330px',
        // The Seine of « Quartiers » on the tablet: from 12 px before the plan to its right edge.
        'seine-tablet': 'calc(100% + 32px)',
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
        // An answer of « Questions fréquentes » (#238). À reporter dans tokens.json.
        'faq-answer': '600px',
        // Column of text of the legal pages (#242, comment of Ilan: 680 px at most).
        legal: '680px',
      },
      // « Questions fréquentes » on the computer (#238): the title and the contact on the left,
      // the questions on the right, as high as they need without pushing the contact down.
      // Footer on the phone and the tablet (#238): what fills the row, then what sits on its right.
      gridTemplateColumns: { faq: '380px 1fr', footer: '1fr auto' },
      gridTemplateRows: { faq: 'auto 1fr' },
      // Shell of the blue frame (E-21, « coque #EDF1FA »): 8 px, 6 px on the phone.
      colors: {
        'frame-shell': '#EDF1FA',
        // Edge of the phone around a screenshot of the app (#237). À reporter dans tokens.json.
        'shot-edge': '#DCE3F2',
        // Empty part of the stars of a rating (E-21 › Envies, #237). À reporter dans tokens.json.
        'star-empty': '#DDE3EE',
        // Plan of Paris of « Quartiers »: its ground and its parks (#237). À reporter dans
        // tokens.json.
        'district-map': '#EAF0FA',
        'district-park': '#DCEBE4',
        // Light of the line of the W of the logo, from its top to its bottom (logo-widoo.svg).
        'w-light-start': '#FAF9F6',
        'w-light-end': '#BFD7EA',
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
        // « Envies » (#237): photo sticker on the phone and from the tablet, rating on a photo. À
        // reporter dans tokens.json.
        'idea-phone': '0 16px 36px rgba(38, 62, 128, 0.18)',
        idea: '0 18px 40px rgba(38, 62, 128, 0.18)',
        rating: '0 6px 16px rgba(38, 62, 128, 0.18)',
        // « Quartiers » (#237): a card on the plan, « Tout Paris est dans l'app », the edge of the
        // plan on the computer. À reporter dans tokens.json.
        district: '0 12px 30px rgba(38, 62, 128, 0.18)',
        'app-link': '0 10px 24px rgba(38, 62, 128, 0.18)',
        'map-edge': 'inset 0 0 0 1px rgba(78, 116, 200, 0.10)',
        // Edge of a closed question, none once open (#238). À reporter dans tokens.json.
        'faq-edge': 'inset 0 0 0 1px #DCE3F2',
        none: 'none',
        // Final banner (#238): light on the top edge of the blue, shadow of its QR code.
        'banner-edge': 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        qr: '0 10px 30px rgba(38, 62, 128, 0.18)',
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
        // « Envies » (#237): its blue panel (phone, tablet, computer), a photo sticker and its photo
        // on the phone, then from the tablet. À reporter dans tokens.json.
        'panel-phone': '36px',
        'panel-tablet': '40px',
        panel: '48px',
        'idea-phone': '26px',
        idea: '28px',
        'idea-photo-phone': '19px',
        // « Quartiers » (#237): the frame of the plan (phone, then tablet and computer), the plan
        // inside, the photo of a district.
        'map-shell-phone': '34px',
        'map-phone': '28px',
        'district-thumb': '14px',
        // « Une autre question ? » (#238). À reporter dans tokens.json.
        contact: '28px',
        // Final banner on the phone (#238): its frame, its blue.
        'banner-shell-phone': '38px',
        'banner-phone': '32px',
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
        // Photo stickers of « Envies », one tilt per mood: phone and tablet, then computer (#237).
        // À reporter dans tokens.json.
        'idea-1': '-1.8deg',
        'idea-2': '1.5deg',
        'idea-3': '-1.2deg',
        'idea-4': '1.2deg',
        'idea-5': '-1.5deg',
        'idea-1-xl': '-3deg',
        'idea-2-xl': '2.5deg',
        'idea-3-xl': '-2deg',
        'idea-4-xl': '2deg',
        'idea-5-xl': '-2.5deg',
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
        // Photos of « Envies » (#237): phone; tablet, the first one larger; computer, the first one
        // as high as two rows. Rating on a photo, larger on the first one. À reporter dans
        // tokens.json.
        'idea-photo-phone': '172px',
        'idea-photo-tablet': '196px',
        'idea-photo-large-tablet': '320px',
        'idea-photo': '190px',
        'idea-photo-large': '584px',
        rating: '30px',
        'rating-l': '34px',
        // Plan of Paris of « Quartiers » on the computer (#237).
        'district-map': '640px',
        // Final banner (#238): the tablet, the computer. À reporter dans tokens.json.
        'banner-tablet': '440px',
        banner: '460px',
      },
      minHeight: {
        'plan-frame': '720px',
        // Text of a step of « Comment ça marche » on the tablet, so that the screenshots line up.
        'how-text-tablet': '212px',
        // A question of « Questions fréquentes », 72 px high when it holds on one line (#238).
        'faq-question': '72px',
      },
      // Places of the steps of « Comment ça marche » on the computer (#237), in its 1200 px
      // column. À reporter dans tokens.json.
      // The path of the tablet starts 80 px off the left, its line 22 px from the top, and turns
      // 14 px past the column; on the phone, the line between two numbers.
      inset: {
        // The W of the final banner, held in its top right corner (#238).
        0: '0px',
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
      // A photo sticker of « Envies » straightens up on hover in 250 ms (#237).
      transitionDuration: { press: '160ms', tilt: '250ms' },
      transitionTimingFunction: { out: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      translate: { nudge: '2px' },
      animation: {
        'plan-draw': 'plan-draw 1800ms linear 300ms both',
        // The W of the final banner (#238): at once, slowing down at the end, as the steps of the plan.
        'w-draw': 'plan-draw 1200ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'plan-pop': 'plan-pop 260ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'plan-fade': 'plan-fade 200ms linear both',
        rise: 'rise 500ms cubic-bezier(0.23, 1, 0.32, 1) both',
        land: 'land 500ms cubic-bezier(0.23, 1, 0.32, 1) both',
      },
    },
  },
};
