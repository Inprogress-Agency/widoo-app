import { motion } from '@widoo/tokens';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Whether the screen is in sight: false while another screen covers it, such as the route sheet
 * (E-05), a full-screen modal, and until the modal has slid away (`motion.durations.page`). A map
 * under a full-screen modal is out of the window: it does not follow a camera asked for then.
 */
export function useIsInSight(): boolean {
  const [isInSight, setIsInSight] = useState(true);
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setIsInSight(true), motion.durations.page);
      return () => {
        clearTimeout(timer);
        setIsInSight(false);
      };
    }, []),
  );
  return isInSight;
}
