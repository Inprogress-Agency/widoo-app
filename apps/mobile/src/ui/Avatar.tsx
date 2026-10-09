import { colors, firstLaunch, size as sizes } from '@widoo/tokens';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import AvatarWidoo from './svg/generated/AvatarWidoo';
import { Text } from './Text';

/** Creator line of a card or a summary (22 pt), creator box of a route sheet (44 pt). */
export type AvatarSize = 'avatar-s' | 'avatar-l';

const sizeClassNames: Record<AvatarSize, string> = {
  'avatar-s': 'size-avatar-s',
  'avatar-l': 'size-avatar-l',
};

/** The W of the logo, in the gradient of the source file (tokens.json › firstLaunch.logo). */
const [logoGradientFrom, logoGradientTo] = firstLaunch.logo.stroke.gradient;

interface AvatarProps {
  /** The creator's photo; without one, the initial of `name`. */
  url: string | null;
  name: string;
  /** « Par Widoo »: the logo of the team. */
  isWidoo?: boolean;
  size?: AvatarSize;
}

/**
 * Avatar of a creator, decorative: « Par {prénom} » after it carries the name. A route of the
 * team shows the Widoo logo cut in a disc (Direction-Artistique › Logo, D-071). The photo is
 * cached on disk by expo-image, the initial shows while it loads.
 */
export function Avatar({ url, name, isWidoo = false, size = 'avatar-s' }: AvatarProps) {
  if (isWidoo) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AvatarWidoo
          size={sizes[size]}
          color={colors['blue-on-strong']}
          gradientFrom={logoGradientFrom}
          gradientTo={logoGradientTo}
        />
      </View>
    );
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`${sizeClassNames[size]} items-center justify-center overflow-hidden rounded-pill bg-blue-soft`}
    >
      <Text variant="caption" color="blue-ink" isDense>
        {name.charAt(0).toUpperCase()}
      </Text>
      {url && <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />}
    </View>
  );
}
