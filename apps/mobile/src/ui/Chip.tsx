import { activityFamilies, colors, size, type ActivityFamily, type IconName } from '@widoo/tokens';
import { Pressable } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

// The chip is 36 points high: its hit slop brings the touch target to 44 points.
const hitSlop = (size['touch-min'] - size['chip-h']) / 2;

interface ChipProps {
  label: string;
  icon?: IconName;
  /** Active: ink with a check, never the color alone (Direction-Artistique › Accessibilité). */
  isActive?: boolean;
  /** A mood chip takes the tint of its family: Culture, Nature, Shopping, Gastronomie. */
  family?: ActivityFamily;
  /** White on the map, warm grey in a sheet. */
  surface?: 'bg' | 'surface';
  onPress: () => void;
}

/** Filter chip of E-01 and E-03: a dense component, its text capped at 1.3 times. */
export function Chip({
  label,
  icon,
  isActive = false,
  family,
  surface = 'bg',
  onPress,
}: ChipProps) {
  const tint = family ? activityFamilies[family].chip : null;
  const ink = isActive ? 'on-strong' : (tint?.ink ?? 'ink');
  const background = isActive ? 'surface-strong' : (tint?.bg ?? surface);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      hitSlop={hitSlop}
      onPress={onPress}
      className="min-h-chip-h flex-row items-center gap-6 self-start rounded-pill px-12 py-6"
      // Tint chosen at runtime among the tokens.
      style={{ backgroundColor: colors[background] }}
    >
      {isActive ? (
        <Icon name="check" size="space-16" color={ink} weight="bold" />
      ) : (
        icon && <Icon name={icon} size="space-16" color={ink} />
      )}
      <Text variant="label" color={ink} isDense>
        {label}
      </Text>
    </Pressable>
  );
}
