import { motion } from '@widoo/tokens';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type HapticKey = keyof typeof motion.haptics;

/**
 * A vibration of Direction-Artistique › Mouvement (D-030), as `mappings.motion.haptics` names it
 * for each system: expo-haptics on iOS, `performAndroidHapticsAsync` on Android. Nothing else
 * vibrates; kept with « Réduire les animations ».
 */
export function haptic(key: HapticKey): void {
  const feedback = motion.haptics[key];
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics[feedback.android]);
    return;
  }
  const { ios } = feedback;
  switch (ios.method) {
    case 'selectionAsync':
      void Haptics.selectionAsync();
      break;
    case 'impactAsync':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle[ios.style]);
      break;
    case 'notificationAsync':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType[ios.style]);
      break;
  }
}
