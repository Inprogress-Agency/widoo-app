import { z } from 'zod';

// Shape of the wiki's tokens.json, as far as the generator reads it: a change of format fails
// the generation instead of producing a wrong theme. Free-text notes are not read.

const px = z.string().regex(/^-?\d+(\.\d+)?px$/, 'expected a value in px');
const em = z.string().regex(/^-?\d+(\.\d+)?em$/, 'expected a value in em');
const color = z.string().regex(/^(#[0-9A-F]{6}|rgba\(\d+, \d+, \d+, \d?\.\d+\))$/);

const textStyle = z.object({
  name: z.string(),
  fontSize: px,
  lineHeight: px,
  fontWeight: z.number().int(),
  letterSpacing: em.optional(),
  textTransform: z.literal('uppercase').optional(),
});

const namedPx = z.array(z.object({ name: z.string(), value: px }));

const family = z.object({
  key: z.string(),
  color: z.string(),
  chip: z.object({ bg: z.string(), ink: z.string() }).nullable(),
  moodDot: z.string().nullable(),
});

const filterGroup = z.array(z.object({ value: z.string(), icon: z.string().nullable() }));

const badge = z.object({
  bg: z.string().nullable(),
  ink: z.string(),
  icon: z.string().nullable(),
  iconColor: z.string().optional(),
  iconStyle: z.literal('fill').optional(),
});

const toastState = z.object({
  icon: z.string(),
  color: z.string(),
  role: z.enum(['status', 'alert']),
  seconds: z.number().nullable(),
});

const cubicBezier = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const haptic = z.object({ ios: z.string(), android: z.string() });

export const tokensSchema = z.object({
  version: z.number().int(),
  color: z.object({
    tokens: z.array(z.object({ name: z.string(), value: z.object({ light: color }) })),
  }),
  type: z.object({
    fonts: z.array(z.object({ family: z.string(), weight: z.string().regex(/^\d00$/) })),
    groups: z.array(z.object({ styles: z.array(textStyle) })),
  }),
  spacing: z.object({ tokens: namedPx }),
  radius: z.object({ tokens: namedPx }),
  size: z.object({ tokens: namedPx }),
  shadow: z.object({
    tokens: z.array(z.object({ name: z.string(), value: z.object({ light: z.string() }) })),
  }),
  mappings: z.object({
    activityFamilies: z.array(family),
    placeCategories: z.array(
      z.object({ category: z.string(), family: z.string(), icon: z.string() }),
    ),
    filterIcons: z.record(z.string(), filterGroup),
    moodDots: z.array(z.object({ mood: z.string(), dot: z.string() })),
    uiIcons: z.record(z.string(), z.string()),
    badges: z.record(z.string(), badge),
    darkSurfaces: z.array(z.string()),
    immersive: z.object({
      bg: z.string(),
      photoHeight: z.number(),
      veil: z.string(),
      section: z.object({
        bg: z.string(),
        radius: z.string(),
        icon: z.string(),
        link: z.string(),
        ok: z.string(),
      }),
      commands: z.object({ height: z.number() }),
      miniPlayer: z.object({
        bg: z.string(),
        radius: z.string(),
        height: z.number(),
        shadow: z.string(),
      }),
    }),
    toast: z.object({
      bg: z.string(),
      title: z.string(),
      subtitle: z.string(),
      disc: z.string(),
      action: z.object({ bg: z.string(), ink: z.string() }),
      shadow: z.string(),
      states: z.object({
        success: toastState,
        info: toastState,
        warning: toastState,
        error: toastState,
      }),
    }),
    accessibility: z.object({
      textContrast: z.number(),
      uiContrast: z.number(),
      touchMin: z.number(),
      maxFontSizeMultiplierDense: z.number(),
      reflowFontScale: z.number(),
      denseComponents: z.array(z.string()),
    }),
    motion: z.object({
      durationsMs: z.record(z.string(), z.number()),
      easings: z.record(z.string(), cubicBezier),
      springGesture: z.object({
        damping: z.number(),
        stiffness: z.number(),
        mass: z.number(),
        overshootClamping: z.boolean(),
      }),
      press: z.object({ filled: z.string(), cardsAndDiscs: z.string(), linksAndIcons: z.string() }),
      scroll: z.object({ photoParallax: z.number(), barFadeDistancePx: z.number() }),
      haptics: z.record(z.string(), z.union([haptic, z.boolean()])),
    }),
  }),
});

export type Tokens = z.infer<typeof tokensSchema>;
