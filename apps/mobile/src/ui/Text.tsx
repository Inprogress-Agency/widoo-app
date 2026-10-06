import {
  accessibility,
  colors,
  textStyles,
  type ColorToken,
  type TextStyleToken,
} from '@widoo/tokens';
import { Platform, Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { useFontScale } from './useFontScale';

export interface TextProps extends NativeTextProps {
  /** Text style of tokens.json: size, line height, weight and letter spacing. */
  variant: TextStyleToken;
  color?: ColorToken;
  /**
   * Text of a dense component (chips, tab bar, badges on photos...): its size follows the system
   * setting up to 1.3 times (Direction-Artistique › Accessibilité). Set by the base components,
   * never by a screen.
   */
  isDense?: boolean;
}

/**
 * Android 14 scales large text non-linearly, a line height by its own value: scaled less than the
 * font size, it clips descenders at 150 % (#21). Android keeps the font's own line spacing; iOS,
 * which scales both alike, takes the line height of tokens.json.
 */
function platformTextStyle(variant: TextStyleToken) {
  const { lineHeight, ...style } = textStyles[variant];
  return Platform.OS === 'ios' ? { ...style, lineHeight } : style;
}

/**
 * How far the text grows with the system text size (D-046): titles of `titleMinFontSize` points
 * and more up to 1.2 times, as iOS and Android 14 do by themselves; dense components up to 1.3
 * times; any other text follows the setting. The lower cap wins for a title in a dense component.
 */
export function maxFontSizeMultiplier(
  variant: TextStyleToken,
  isDense: boolean,
): number | undefined {
  const caps = [
    ...(textStyles[variant].fontSize >= accessibility.titleMinFontSize
      ? [accessibility.maxFontSizeMultiplierTitle]
      : []),
    ...(isDense ? [accessibility.maxFontSizeMultiplierDense] : []),
  ];
  return caps.length > 0 ? Math.min(...caps) : undefined;
}

/**
 * Every text of the app: a text style and a color of tokens.json, nothing written by hand.
 *
 * When the system text size changes with the app open, iOS draws the text larger but keeps its
 * measured frame: React Native's new renderer does not lay the tree out again (#150). A new font
 * scale remounts the native text, which is measured afresh, and so are the views around it.
 */
export function Text({ variant, color = 'ink', isDense = false, style, ...props }: TextProps) {
  const fontScale = useFontScale();
  return (
    <NativeText
      key={fontScale}
      maxFontSizeMultiplier={maxFontSizeMultiplier(variant, isDense)}
      style={[platformTextStyle(variant), { color: colors[color] }, style]}
      {...props}
    />
  );
}
