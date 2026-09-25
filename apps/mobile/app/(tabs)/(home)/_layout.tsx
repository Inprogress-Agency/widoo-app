import { motion } from '@widoo/tokens';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// A link straight to a section still has the map under it, to come back to.
export const unstable_settings = { initialRouteName: 'index' };

/**
 * The Accueil tab: the map and its sheet (E-01), and « Voir tout » pushed over them (E-04), the
 * tab bar in place. The push is M-03: the page comes from the right and the one left recedes a
 * third under an ink veil, the iOS push, taken up on Android by `ios_from_right`
 * (`mappings.motion.page`). With « Réduire les animations », a fade in place.
 */
export default function HomeLayout() {
  const isReducedMotion = useReducedMotion();
  const pageAnimation = Platform.OS === 'android' ? 'ios_from_right' : 'default';
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: isReducedMotion ? 'fade' : pageAnimation,
        animationDuration: isReducedMotion ? motion.durations.fade : motion.durations.page,
      }}
    />
  );
}
