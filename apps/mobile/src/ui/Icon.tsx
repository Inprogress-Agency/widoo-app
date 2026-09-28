import {
  colors,
  size as sizes,
  uiIcons,
  type ColorToken,
  type IconName,
  type SizeToken,
  type UiIconKey,
} from '@widoo/tokens';
import { icons } from '@widoo/tokens/icons';
import { View } from 'react-native';

type Weight = 'regular' | 'fill' | 'bold';

/**
 * Icon sizes of tokens.json (D-054): `icon-s` 16 for status lines and dots, `icon-m` 20 for chips,
 * `icon-l` 24 for tabs. Never the spacing scale.
 */
export type IconSize = Extract<SizeToken, `icon-${string}`>;

export interface IconProps {
  name: IconName;
  /** Side, an icon size token. */
  size?: IconSize;
  color?: ColorToken;
  /** Regular by default; fill for an active state, the rating, Premium and toasts; bold for the check and the plus. */
  weight?: Weight;
  /** An icon alone is labelled and read; without a label it is decorative and hidden. */
  accessibilityLabel?: string;
}

/** A Phosphor icon of tokens.json, by name: an icon outside the mappings does not exist. */
export function Icon({
  name,
  size = 'icon-m',
  color = 'ink',
  weight = 'regular',
  accessibilityLabel,
}: IconProps) {
  const Component = icons[name];
  const glyph = <Component size={sizes[size]} color={colors[color]} weight={weight} />;
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
