import { motion } from '@widoo/tokens';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type HapticKey = keyof typeof motion.haptics;

/**
 * Starts a vibration without waiting for it. A vibration is a garnish: a phone without a
 * haptics engine (Redmi Note 9: « A haptics engine is not available on this device ») rejects
 * it, and that refusal is dropped in silence, neither an error nor a Sentry report.
 */
function vibrate(start: () => Promise<void>): void {
  try {
    start().catch(() => undefined);
  } catch {
    // A native module missing from the build throws before any promise: same silence.
  }
}

/**
 * A vibration of Direction-Artistique › Mouvement (D-030), as `mappings.motion.haptics` names it
 * for each system: expo-haptics on iOS, `performAndroidHapticsAsync` on Android. Nothing else
 * vibrates; kept with « Réduire les animations ».
 */
export function haptic(key: HapticKey): void {
  const feedback = motion.haptics[key];
  if (Platform.OS === 'android') {
    vibrate(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics[feedback.android]));
    return;
  }
  const { ios } = feedback;
  switch (ios.method) {
    case 'selectionAsync':
      vibrate(() => Haptics.selectionAsync());
      break;
    case 'impactAsync':
      vibrate(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle[ios.style]));
      break;
    case 'notificationAsync':
      vibrate(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType[ios.style]));
      break;
  }
}
