import { fontFamilies } from '@widoo/tokens';
import type { TextStyle } from 'react-native';

/**
 * Design tokens of the app: wiki Direction-Artistique, and Design-Changelog D-003 (palette,
 * font, radii), D-004 (activity families) and D-007 (contrast fixes). Light theme only: no dark
 * mode at the MVP. Screens read the semantic `colors`, never `palette` directly.
 */
export const palette = {
  white: '#FFFFFF',
  /** Background of the working palette, replaced by pure white in D-003. */
  cream: '#FAF9F6',
  /** Cards, discs, switches. */
  warmGrey: '#F6F5F1',
  /** Skeleton blocks on warm grey (loading states). */
  stone: '#E8E7E2',
  /** Active chip, active tab, map tooltip: the only dark surfaces. */
  ink: '#14171F',
  muted: '#5F6B80',
  /** Outline of an unchecked control (D-007). */
  slate: '#7F8A9C',
  /** Logo, icon of the active tab. */
  blue: '#5A7FCF',
  /** Selected marker, route line, filter counter, « Voir tout ». */
  blueBright: '#4E74C8',
  /** Blue text or link on warm grey (D-007): #4E74C8 only reaches 4.1:1 there. */
  blueInk: '#3A4FA8',
  /** Secondary surfaces, water on the map. */
  blueLight: '#BFD7EA',
  /** Warm accent: favorite, Gastronomie. Under 4.5:1 on white: never for text. */
  coral: '#F2592A',
  /** Rating stars and sun, decorative. */
  yellow: '#F5B301',
  verifiedSurface: '#E3F3EC',
  verifiedText: '#1F6B52',
  signatureSurface: '#FFE4D9',
  signatureText: '#A63D12',
} as const;

/** Colors by role. Each text pair is checked against WCAG AA in `theme.test.ts`. */
export const colors = {
  background: palette.white,
  surface: palette.warmGrey,
  skeleton: palette.stone,
  text: palette.ink,
  textMuted: palette.muted,
  /** Links and blue text on `background`. */
  link: palette.blueBright,
  /** Links and blue text on `surface`. */
  linkOnSurface: palette.blueInk,
  /** Filled buttons, with `onPrimary` text. */
  primary: palette.blueBright,
  onPrimary: palette.white,
  inverse: palette.ink,
  onInverse: palette.white,
  tabIconActive: palette.blue,
  accent: palette.coral,
  outline: palette.slate,
} as const;

/** Plus Jakarta Sans only (D-003): 800 for titles and figures, 500 and 400 for text. */
export const fonts = {
  regular: fontFamilies['400'],
  medium: fontFamilies['500'],
  extraBold: fontFamilies['800'],
} as const;

// One font file per weight: no `fontWeight`, which Android would apply on top of the file. No
// `lineHeight` either: Android 14 scales large text non-linearly, a line height scaled less than
// its font size clips descenders at 150 %; the font's own line spacing follows the text size.
export const typography = {
  /** Large screen title (« Voir tout »). */
  display: { fontFamily: fonts.extraBold, fontSize: 26 },
  /** Section title, greeting. */
  title: { fontFamily: fonts.extraBold, fontSize: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16 },
  /** Buttons, active tab, links. */
  label: { fontFamily: fonts.medium, fontSize: 15 },
  /** Chips, subtitles, secondary lines. */
  caption: { fontFamily: fonts.regular, fontSize: 13 },
} as const satisfies Record<string, TextStyle>;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { photo: 12, card: 18, pill: 999 } as const;

/** Accessibility rules of Direction-Artistique. */
export const a11y = {
  /** Smallest touch target, in points. */
  minTouchSize: 44,
  /** Font scale cap of dense components: chips, tab bar, markers, counters, badges. */
  denseMaxFontSizeMultiplier: 1.3,
} as const;

/** The only shadow of the app: the floating tab bar (D-003). */
export const tabBarShadow = '0px 4px 16px rgba(20, 23, 31, 0.12)';
