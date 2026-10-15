import { motion } from '@widoo/tokens';
import type { ReactNode } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppUpdate } from './appUpdate';
import { RequiredUpdateScreen } from './RequiredUpdateScreen';

/**
 * Before everything else (Ecrans › E-20): a build under `minVersion` gets the required update,
 * faded in over the launch screen, and nothing of the app behind it.
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const { update } = useAppUpdate();
  if (update !== 'required') {
    return children;
  }
  return (
    <Animated.View className="flex-1" entering={FadeIn.duration(motion.durations.fade)}>
      <RequiredUpdateScreen />
    </Animated.View>
  );
}
