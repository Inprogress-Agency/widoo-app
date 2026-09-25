import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { timing } from './motion';

interface SkeletonProps {
  className?: string;
}

/**
 * Warm grey block of a loading card (M-09): a lighter band sweeps across it in `shimmer`, on a
 * loop; with « Réduire les animations », the block stays still. Decorative: the list around it
 * is the one announced busy.
 */
export function Skeleton({ className }: SkeletonProps) {
  const isReducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  // A band a third as wide as the block, from its left edge out to its right edge.
  const band = width / 3;
  const sweep = useAnimatedStyle(() => ({
    width: band,
    transform: [{ translateX: -band + progress.get() * (width + band) }],
  }));

  useEffect(() => {
    if (isReducedMotion || width === 0) {
      return;
    }
    progress.set(withRepeat(withTiming(1, timing('shimmer', 'fade', 'linear')), -1));
    return () => cancelAnimation(progress);
  }, [isReducedMotion, progress, width]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className={`overflow-hidden bg-skeleton ${className ?? ''}`}
    >
      {!isReducedMotion && <Animated.View style={[styles.band, sweep]} className="bg-surface" />}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
