import { colors, spacing, type ColorToken } from '@widoo/tokens';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Height of the fade: the 32 px of `accessibility.scrollEdge` (D-046), which tokens.json writes
 * in words; `space-32` is the token of that size.
 */
export const scrollEdgeHeight = spacing['space-32'];

interface ScrollEdgeFadeProps {
  /** Background of the page under the fade. */
  color?: ColorToken;
  /** Height of the bar stuck at the foot: the fade rests on its top edge. */
  bottom: number;
}

/**
 * Fade at the cut edge of a page that scrolls under a bar stuck at its foot (Direction-Artistique
 * › Accessibilité, D-046): drawn over the scrolled content, on the top edge of the bar, so that
 * the cut content shows that the page goes on. A sibling of the scroll view, not a child of the
 * bar: a sheet clips its footer to its own frame. The scrolled content ends `scrollEdgeHeight`
 * higher, so that nothing stays under the fade at the end. Decorative, untouchable.
 */
export function ScrollEdgeFade({ color = 'bg', bottom }: ScrollEdgeFadeProps) {
  // An SVG id holds no colon.
  const id = `scroll-edge-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // The bar height is measured at runtime.
      style={[styles.fade, { bottom }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors[color]} stopOpacity={0} />
            <Stop offset="1" stopColor={colors[color]} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, height: scrollEdgeHeight },
});
