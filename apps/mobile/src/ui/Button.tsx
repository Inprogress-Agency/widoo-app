import { colors, motion, type ColorToken, type UiIconKey } from '@widoo/tokens';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, uiIcon } from './Icon';
import { timing } from './motion';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'premium' | 'inverse';

// Literal classes, so that Tailwind finds them. Premium is the ink button « Débloquer avec
// Premium » (D-014), secondary the warm grey « Programmer », inverse the white « Voir plus » of
// the map tooltip, on ink. An inactive primary button turns warm grey, its text `muted`
// (« Continuer » of E-10, 4.35:1, out of requirement for an inactive control).
const variants = {
  primary: { className: 'bg-blue', label: 'on-blue', disabledLabel: 'muted' },
  secondary: { className: 'bg-surface', label: 'ink', disabledLabel: 'muted' },
  premium: { className: 'bg-surface-strong', label: 'on-strong', disabledLabel: 'on-strong-muted' },
  inverse: { className: 'bg-bg', label: 'ink', disabledLabel: 'muted' },
} as const satisfies Record<
  Variant,
  { className: string; label: ColorToken; disabledLabel: ColorToken }
>;

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** A dense button, such as « Continuer avec un e-mail » (D-028): text capped at 1.3 times. */
  isDense?: boolean;
  /** As wide as its container, such as « Voir plus » in the map tooltip. */
  isFullWidth?: boolean;
  /** Interface icon before the label, decorative: the clock of « Programmer » (E-05). */
  icon?: UiIconKey;
  /** What the screen where it leads is not built yet: dimmed label, announced « estompé ». */
  isDisabled?: boolean;
  accessibilityHint?: string;
  /** What a screen reader says when it differs from the label: the date of a planning. */
  accessibilityLabel?: string;
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
  icon,
  isDisabled = false,
  accessibilityHint,
  accessibilityLabel = label,
}: ButtonProps) {
  const variantStyle = variants[variant];
  const labelColor = isDisabled ? variantStyle.disabledLabel : variantStyle.label;
  const pressed = useSharedValue(0);
  const veil = useAnimatedStyle(() => ({
    opacity: pressed.get() * motion.press.filledVeil.opacity,
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.set(withTiming(1, timing('press', 'fade')));
      }}
      onPressOut={() => {
        pressed.set(withTiming(0, timing('pressRelease', 'fade')));
      }}
      // As wide as its container, its label centred: a narrower padding keeps it on one line in
      // half a bar at large text sizes (Ecrans › E-05, barre collée).
      className={`min-h-button-h flex-row items-center justify-center gap-6 overflow-hidden rounded-pill py-12 ${isFullWidth ? 'self-stretch px-12' : 'self-center px-24'} ${isDisabled && variant === 'primary' ? 'bg-skeleton' : variantStyle.className}`}
    >
      {/* Animated style: out of NativeWind's reach, values from the generated theme. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink }, veil]}
      />
      {/* An icon with its own color keeps it: the gold crown of « Débloquer avec Premium ». */}
      {icon && <Icon {...uiIcon(icon)} size="icon-m" color={uiIcon(icon).color ?? labelColor} />}
      <Text variant="button" color={labelColor} isDense={isDense} className="shrink text-center">
        {label}
      </Text>
    </Pressable>
  );
}
