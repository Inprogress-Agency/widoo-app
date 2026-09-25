import { colors, motion, type ColorToken } from '@widoo/tokens';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timing } from './motion';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'premium' | 'inverse';

// Literal classes, so that Tailwind finds them. Premium is the ink button « Débloquer avec
// Premium » (D-014), secondary the warm grey « Programmer », inverse the white « Voir plus » of
// the map tooltip, on ink.
const variants = {
  primary: { className: 'bg-blue', label: 'on-blue' },
  secondary: { className: 'bg-surface', label: 'ink' },
  premium: { className: 'bg-surface-strong', label: 'on-strong' },
  inverse: { className: 'bg-bg', label: 'ink' },
} as const satisfies Record<Variant, { className: string; label: ColorToken }>;

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** A dense button, such as « Continuer avec un e-mail » (D-028): text capped at 1.3 times. */
  isDense?: boolean;
  /** As wide as its container, such as « Voir plus » in the map tooltip. */
  isFullWidth?: boolean;
}

/**
 * Pill button of 48 points at least: its height follows the label, which can wrap at large text
 * sizes. Pressed, an ink veil fades in (D-030); a fade, so it stays with « Réduire les animations ».
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  isDense = false,
  isFullWidth = false,
}: ButtonProps) {
  const pressed = useSharedValue(0);
  const veil = useAnimatedStyle(() => ({
    opacity: pressed.get() * motion.press.filledVeil.opacity,
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        pressed.set(withTiming(1, timing('press', 'fade')));
      }}
      onPressOut={() => {
        pressed.set(withTiming(0, timing('pressRelease', 'fade')));
      }}
      className={`min-h-button-h justify-center overflow-hidden rounded-pill px-24 py-12 ${isFullWidth ? 'self-stretch' : 'self-center'} ${variants[variant].className}`}
    >
      {/* Animated style: out of NativeWind's reach, values from the generated theme. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink }, veil]}
      />
      <Text
        variant="button"
        color={variants[variant].label}
        isDense={isDense}
        className="text-center"
      >
        {label}
      </Text>
    </Pressable>
  );
}
