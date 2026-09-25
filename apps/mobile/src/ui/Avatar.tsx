import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';

interface AvatarProps {
  /** The creator's photo; without one, the initial of `name`. */
  url: string | null;
  name: string;
  /** « Par Widoo »: the blue disc of the team. */
  isWidoo?: boolean;
}

/**
 * 22-point avatar of the creator line, decorative: « Par {prénom} » after it carries the name.
 * The photo is cached on disk by expo-image, the initial shows while it loads.
 */
export function Avatar({ url, name, isWidoo = false }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`size-avatar-s items-center justify-center overflow-hidden rounded-pill ${isWidoo ? 'bg-blue' : 'bg-blue-soft'}`}
    >
      <Text variant="caption" color={isWidoo ? 'on-blue' : 'blue-ink'} isDense>
        {name.charAt(0).toUpperCase()}
      </Text>
      {url && !isWidoo && (
        <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}
