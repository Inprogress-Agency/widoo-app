import type { Tokens } from './schema';

// Values of tokens.json turned into React Native units: light theme only (the dark theme is not
// validated), sizes in points, letter spacing from em to points.

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

export function toPoints(value: string): number {
  return Number.parseFloat(value);
}

/** One font file per weight, loaded under this name: `PlusJakartaSans-800`. */
export function fontFamilyName(family: string, weight: string | number): string {
  return `${family.replaceAll(' ', '')}-${weight}`;
}

function inPoints(tokens: readonly { name: string; value: string }[]): Record<string, number> {
  return Object.fromEntries(tokens.map((token) => [token.name, toPoints(token.value)]));
}

function buildTextStyles(tokens: Tokens, fontFamilies: Record<string, string>) {
  const textStyles: Record<string, TextStyle> = {};
  for (const style of tokens.type.groups.flatMap((group) => group.styles)) {
    const fontFamily = fontFamilies[String(style.fontWeight)];
    if (!fontFamily) {
      throw new Error(`text style ${style.name}: no font file for weight ${style.fontWeight}`);
    }
    const fontSize = toPoints(style.fontSize);
    textStyles[style.name] = {
      fontFamily,
      fontSize,
      lineHeight: toPoints(style.lineHeight),
      // React Native takes letter spacing in points: the em value times the font size.
      ...(style.letterSpacing && {
        letterSpacing: Math.round(toPoints(style.letterSpacing) * fontSize * 100) / 100,
      }),
      ...(style.textTransform && { textTransform: style.textTransform }),
    };
  }
  return textStyles;
}

export function buildTheme(tokens: Tokens) {
  const fontFamilies: Record<string, string> = Object.fromEntries(
    tokens.type.fonts.map((font) => [font.weight, fontFamilyName(font.family, font.weight)]),
  );
  return {
    colors: Object.fromEntries(
      tokens.color.tokens.map((token) => [token.name, token.value.light]),
    ) as Record<string, string>,
    fontFamilies,
    textStyles: buildTextStyles(tokens, fontFamilies),
    spacing: inPoints(tokens.spacing.tokens),
    radius: inPoints(tokens.radius.tokens),
    size: inPoints(tokens.size.tokens),
    shadow: Object.fromEntries(
      tokens.shadow.tokens.map((token) => [token.name, token.value.light]),
    ) as Record<string, string>,
  };
}

export type Theme = ReturnType<typeof buildTheme>;
