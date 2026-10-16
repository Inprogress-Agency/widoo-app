import { colors } from '@widoo/tokens';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * `mappings.immersive.textVeil` (tokens version 10, D-034), which the generated theme does not
 * carry yet: ink from 0 to 75 % over the 96 points above the status, then to 92 % at the foot of
 * the block. Anchored to the top of the block, it follows it when the text grows.
 */
export const TEXT_VEIL_RISE = 96;
const stops = { top: 0, rise: 0.75, foot: 0.92 } as const;

function Ramp({ from, to, style }: { from: number; to: number; style: object }) {
  // An SVG id holds no colon.
  const id = `text-veil-${useId().replace(/[^\w-]/g, '')}`;
  const ink = colors['surface-strong'];
  return (
    <Svg width="100%" style={style}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ink} stopOpacity={from} />
          <Stop offset="1" stopColor={ink} stopOpacity={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Behind the block of E-07, from 96 points above it to its foot. Decorative. */
export function TextVeil({ bleed }: { bleed: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.veil, { left: -bleed, right: -bleed, bottom: -bleed }]}
    >
      <Ramp from={stops.top} to={stops.rise} style={{ height: TEXT_VEIL_RISE }} />
      <Ramp from={stops.rise} to={stops.foot} style={styles.rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  veil: { position: 'absolute', top: -TEXT_VEIL_RISE },
  rest: { flex: 1 },
});
