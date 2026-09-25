import {
  accessibility,
  colors,
  textStyles,
  type ColorToken,
  type TextStyleToken,
} from '@widoo/tokens';
import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';

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

/** Every text of the app: a text style and a color of tokens.json, nothing written by hand. */
export function Text({ variant, color = 'ink', isDense = false, style, ...props }: TextProps) {
  return (
    <NativeText
      maxFontSizeMultiplier={isDense ? accessibility.maxFontSizeMultiplierDense : undefined}
      style={[textStyles[variant], { color: colors[color] }, style]}
      {...props}
    />
  );
}
