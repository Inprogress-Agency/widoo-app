// Généré depuis tokens.json (version 8), ne pas modifier : pnpm --filter @widoo/tokens generate.
export const tokensVersion = 8;

/** Light theme: the dark values are not validated and not generated. */
export const colors = {
  "bg": "#FFFFFF",
  "surface": "#F6F5F1",
  "surface-strong": "#14171F",
  "ink": "#14171F",
  "muted": "#5F6B80",
  "on-strong": "#FFFFFF",
  "on-strong-muted": "#D5D8E0",
  "line": "#ECEBE7",
  "handle": "#D9DCE3",
  "skeleton": "#E8E7E2",
  "rail": "#D0D4DC",
  "control-border": "#7F8A9C",
  "control-border-disabled": "#C3C8D3",
  "scrim": "rgba(20, 23, 31, 0.40)",
  "photo-shade": "rgba(20, 23, 31, 0.45)",
  "photo-veil": "rgba(20, 23, 31, 0.62)",
  "blue": "#4E74C8",
  "on-blue": "#FFFFFF",
  "blue-on-strong": "#5A7FCF",
  "blue-ink": "#3A4FA8",
  "blue-soft": "#E4ECFA",
  "badge-signature-bg": "rgba(228, 236, 250, 0.86)",
  "green-soft": "#E3F3EC",
  "green-ink": "#1F6B52",
  "badge-verified-bg": "rgba(227, 243, 236, 0.86)",
  "coral": "#F2592A",
  "coral-soft": "#FFE4D9",
  "coral-ink": "#A63D12",
  "amber": "#F5B301",
  "alert": "#8C5A00",
  "alert-soft": "#FFF4D6",
  "plum-soft": "#F3E4EC",
  "plum-ink": "#7A2A4A",
  "violet-soft": "#ECE7F8",
  "violet-ink": "#5A3FA8",
  "family-food": "#F2592A",
  "family-culture": "#7A2A4A",
  "family-nature": "#2A8A62",
  "family-shop": "#5A3FA8",
  "family-leisure": "#128A87",
  "family-other": "#5F6B80",
  "mood-romantic": "#D0405F",
  "mood-unusual": "#9A3FC0",
  "mood-instagrammable": "#BC3797",
  "mood-relax": "#1F87B5",
  "mood-sport": "#5E8F12",
  "success-on-strong": "#4CC38A",
  "info-on-strong": "#8EA8F0",
  "error-on-strong": "#FF6B5A",
  "toast-disc": "rgba(255, 255, 255, 0.10)",
  "surface-strong-raised": "rgba(255, 255, 255, 0.06)",
  "toast-action": "rgba(255, 255, 255, 0.14)",
  "badge-premium-bg": "rgba(20, 23, 31, 0.86)",
  "map-base": "#F0EFEC",
  "map-road": "#FFFFFF",
  "map-park": "#E2ECDF",
  "map-water": "#C9DCEF",
  "map-block": "#E8E6E0",
  "map-label": "#5F6B80"
} as const;
export type ColorToken = keyof typeof colors;

/** Font file of each weight, loaded under this name. */
export const fontFamilies = {
  "400": "PlusJakartaSans-400",
  "500": "PlusJakartaSans-500",
  "600": "PlusJakartaSans-600",
  "700": "PlusJakartaSans-700",
  "800": "PlusJakartaSans-800"
} as const;
export type FontWeight = keyof typeof fontFamilies;

/** The 20 text styles, in points. */
export const textStyles = {
  "title-xl": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 26,
    "lineHeight": 32,
    "letterSpacing": -0.52
  },
  "title-l": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 22,
    "lineHeight": 28,
    "letterSpacing": -0.44
  },
  "title-m": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 20,
    "lineHeight": 26,
    "letterSpacing": -0.2
  },
  "title-s": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 17,
    "lineHeight": 22,
    "letterSpacing": -0.17
  },
  "title-card": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 16,
    "lineHeight": 21,
    "letterSpacing": -0.16
  },
  "number-l": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 20,
    "lineHeight": 24,
    "letterSpacing": -0.4
  },
  "number-m": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 17,
    "lineHeight": 22,
    "letterSpacing": -0.17
  },
  "number-s": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 13,
    "lineHeight": 18
  },
  "item": {
    "fontFamily": "PlusJakartaSans-700",
    "fontSize": 16,
    "lineHeight": 21
  },
  "button-l": {
    "fontFamily": "PlusJakartaSans-700",
    "fontSize": 16,
    "lineHeight": 20
  },
  "button": {
    "fontFamily": "PlusJakartaSans-700",
    "fontSize": 15,
    "lineHeight": 20
  },
  "body": {
    "fontFamily": "PlusJakartaSans-400",
    "fontSize": 15,
    "lineHeight": 22
  },
  "body-medium": {
    "fontFamily": "PlusJakartaSans-500",
    "fontSize": 15,
    "lineHeight": 20
  },
  "body-s": {
    "fontFamily": "PlusJakartaSans-500",
    "fontSize": 14,
    "lineHeight": 20
  },
  "tab": {
    "fontFamily": "PlusJakartaSans-500",
    "fontSize": 14,
    "lineHeight": 20
  },
  "label": {
    "fontFamily": "PlusJakartaSans-500",
    "fontSize": 13,
    "lineHeight": 18
  },
  "label-strong": {
    "fontFamily": "PlusJakartaSans-700",
    "fontSize": 13,
    "lineHeight": 18
  },
  "status": {
    "fontFamily": "PlusJakartaSans-600",
    "fontSize": 13,
    "lineHeight": 18
  },
  "caption": {
    "fontFamily": "PlusJakartaSans-500",
    "fontSize": 12,
    "lineHeight": 16
  },
  "map-label": {
    "fontFamily": "PlusJakartaSans-800",
    "fontSize": 13,
    "lineHeight": 16,
    "letterSpacing": 1.3,
    "textTransform": "uppercase"
  }
} as const;
export type TextStyleToken = keyof typeof textStyles;

/** Spacings in points. */
export const spacing = {
  "space-4": 4,
  "space-6": 6,
  "space-8": 8,
  "space-10": 10,
  "space-12": 12,
  "space-16": 16,
  "space-18": 18,
  "space-20": 20,
  "space-24": 24,
  "space-28": 28,
  "space-32": 32
} as const;
export type SpacingToken = keyof typeof spacing;

/** Radii in points. */
export const radius = {
  "radius-thumb": 10,
  "radius-photo": 12,
  "radius-block": 16,
  "radius-card": 18,
  "radius-section": 20,
  "radius-sheet": 24,
  "radius-pill": 999
} as const;
export type RadiusToken = keyof typeof radius;

/** Component sizes in points. */
export const size = {
  "touch-min": 44,
  "chip-h": 36,
  "badge-h": 26,
  "button-h": 48,
  "button-l-h": 52,
  "disc": 44,
  "disc-s": 34,
  "avatar-s": 22,
  "avatar-m": 32,
  "avatar-l": 44,
  "step-dot": 28,
  "step-dot-active": 34,
  "marker": 56,
  "marker-active": 68,
  "thumb": 48,
  "tooltip-w": 260,
  "card-w": 270,
  "card-h": 348,
  "card-list-w": 358,
  "card-list-h": 388,
  "sheet-rest": 120,
  "hero-h": 380
} as const;
export type SizeToken = keyof typeof size;

/** The only shadow, for the native `boxShadow` style. */
export const shadow = {
  "shadow-tabbar": "0 8px 24px rgba(20, 23, 31, 0.10)"
} as const;
export type ShadowToken = keyof typeof shadow;
