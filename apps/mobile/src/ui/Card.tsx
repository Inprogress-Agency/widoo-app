import type { ReactNode } from 'react';
import {
  Pressable,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@widoo/tokens';
import { timing } from './motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** A card that opens something is one accessible element: its label reads the whole card. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** « Ajouter aux favoris », « Voir le profil du créateur »... */
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

/**
 * Warm grey surface with the card radius. Pressed, it shrinks to 0.97 (D-030), unless
 * « Réduire les animations » is on.
 */
export function Card({ children, className, onPress, ...accessibility }: CardProps) {
  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const surface = `overflow-hidden rounded-card bg-surface ${className ?? ''}`;

  if (!onPress) {
    return <View className={surface}>{children}</View>;
  }
  const pressTo = (value: number, duration: 'press' | 'pressRelease') => {
    if (!isReducedMotion) {
      scale.set(withTiming(value, timing(duration, 'move')));
    }
  };
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessible
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => pressTo(motion.press.scale, 'press')}
        onPressOut={() => pressTo(1, 'pressRelease')}
        className={surface}
        {...accessibility}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
