import { motion } from '@widoo/tokens';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export const unstable_settings = { initialRouteName: 'index' };

/**
 * The Profil tab: my profile (E-09) and the settings pushed over it, the tab bar in place (M-03,
 * as the home stack does). With « Réduire les animations », a fade in place.
 */
export default function ProfileLayout() {
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
