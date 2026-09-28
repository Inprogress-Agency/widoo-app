import { colors, size, type ColorToken, type IconName } from '@widoo/tokens';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { timing } from './motion';
import { Text } from './Text';

// The chip is 36 points high: its hit slop brings the touch target to 44 points.
const hitSlop = (size['touch-min'] - size['chip-h']) / 2;

/** Colors of a chip at rest: a mood chip takes the tint of its family or of its dot. */
export interface ChipTint {
  bg: ColorToken;
  ink: ColorToken;
}

const activeTint: ChipTint = { bg: 'surface-strong', ink: 'on-strong' };

interface ChipProps {
  label: string;
  /** What a screen reader says, when it differs from the label: « Jusqu'à 25 euros par personne ». */
  accessibilityLabel?: string;
  icon?: IconName;
  /** Active: ink with a check, never the color alone (Direction-Artistique › Accessibilité). */
  isActive?: boolean;
  /** Tint at rest; without it, white on the map (`bg`) or warm grey in a sheet (`surface`). */
  tint?: ChipTint;
  surface?: 'bg' | 'surface';
  onPress: () => void;
}

/**
 * Filter chip of E-01 and E-03: a dense component, its text capped at 1.3 times. A change of
 * state crossfades colors and check in `fade` (M-08), kept with « Réduire les animations »: a fade
 * replaces the moves, it is not one.
 */
export function Chip({
  label,
  accessibilityLabel = label,
  icon,
  isActive = false,
  tint,
  surface = 'bg',
  onPress,
}: ChipProps) {
  const rest = tint ?? { bg: surface, ink: 'ink' };
  const progress = useSharedValue(isActive ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(isActive ? 1 : 0, timing('fade', 'fade')));
  }, [isActive, progress]);
  const background = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.get(),
      [0, 1],
      [colors[rest.bg], colors[activeTint.bg]],
    ),
  }));
  const activeLayer = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const restLayer = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive }}
      hitSlop={hitSlop}
      onPress={onPress}
      className="self-start"
    >
      <Animated.View
        className="min-h-chip-h flex-row items-center gap-6 rounded-pill px-12 py-6"
        // Animated tint, out of NativeWind's reach: values from the generated theme.
        style={background}
      >
        {(icon || isActive) && (
          <View>
            <Animated.View style={restLayer}>
              {icon ? (
                <Icon name={icon} size="icon-m" color={rest.ink} />
              ) : (
                <View className="size-icon-m" />
              )}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, activeLayer]}>
              <Icon name="check" size="icon-m" color={activeTint.ink} weight="bold" />
            </Animated.View>
          </View>
        )}
        <View className="shrink">
          <Animated.View style={restLayer}>
            <Text variant="label" color={rest.ink} isDense>
              {label}
            </Text>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, activeLayer]}>
            <Text variant="label" color={activeTint.ink} isDense>
              {label}
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
