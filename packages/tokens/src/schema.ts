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
});

export type Tokens = z.infer<typeof tokensSchema>;
