import { motion } from '@widoo/tokens';
import { Easing, ReduceMotion, type WithTimingConfig } from 'react-native-reanimated';

type Duration = keyof typeof motion.durations;
type Curve = keyof typeof motion.easings;

/**
 * A timing of Direction-Artistique › Mouvement (D-030): duration and curve of tokens.json.
 * With « Réduire les animations », a move jumps to its end (`ReduceMotion.System`) while a fade,
 * which replaces the moves, keeps running (`ReduceMotion.Never`).
 */
export function timing(
  duration: Duration,
  kind: 'move' | 'fade',
  curve: Curve = 'standard',
): WithTimingConfig {
  const [x1, y1, x2, y2] = motion.easings[curve];
  return {
    duration: motion.durations[duration],
    easing: Easing.bezier(x1, y1, x2, y2),
    reduceMotion: kind === 'fade' ? ReduceMotion.Never : ReduceMotion.System,
  };
}
