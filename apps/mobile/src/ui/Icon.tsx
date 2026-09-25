import {
  colors,
  spacing,
  uiIcons,
  type ColorToken,
  type IconName,
  type SpacingToken,
  type UiIconKey,
} from '@widoo/tokens';
import { View } from 'react-native';
import { icons } from './icons';

type Weight = 'regular' | 'fill' | 'bold';

export interface IconProps {
  name: IconName;
  /** Side in points. tokens.json has no icon size yet: the spacing scale stands in. */
  size?: SpacingToken;
  color?: ColorToken;
  /** Regular by default; fill for an active state, the rating, Premium and toasts; bold for the check and the plus. */
  weight?: Weight;
  /** An icon alone is labelled and read; without a label it is decorative and hidden. */
  accessibilityLabel?: string;
}

/** A Phosphor icon of tokens.json, by name: an icon outside the mappings does not exist. */
export function Icon({
  name,
  size = 'space-20',
  color = 'ink',
  weight = 'regular',
  accessibilityLabel,
}: IconProps) {
  const Component = icons[name];
  const glyph = <Component size={spacing[size]} color={colors[color]} weight={weight} />;
  if (accessibilityLabel === undefined) {
    return glyph;
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {glyph}
    </View>
  );
}

/** Name, weight and color of an interface icon of tokens.json (`tab-home`, `favorite`...). */
export function uiIcon(
  key: UiIconKey,
  isActive = false,
): Pick<IconProps, 'name' | 'weight' | 'color'> {
  const icon = uiIcons[key];
  const activeWeight = isActive && 'activeWeight' in icon ? icon.activeWeight : 'regular';
  return {
    name: icon.name,
    weight: 'weight' in icon ? icon.weight : activeWeight,
    ...('color' in icon && { color: icon.color }),
  };
}
