import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timing } from '../ui/motion';
import { Text } from '../ui/Text';
import type { GoProgress } from './progress';

interface GoProgressBarProps {
  progress: GoProgress;
  start: string;
  end: string;
  spoken: string;
}

/** How far the current segment is filled: at its start en route, halfway on site. */
const ON_SITE_FILL = 0.5;

/**
 * The progress, as a music player shows it (Ecrans › E-07): one segment per step, white once done,
 * at 45 % once skipped, a 12-point dot at the position of the moment, which glides to the next
 * step (M-08); « Départ 10:00 » and « Fin vers 17:00 » under it. Read as one bar.
 */
export function GoProgressBar({ progress, start, end, spoken }: GoProgressBarProps) {
  const { steps, current, phase, total } = progress;
  const currentIndex = current?.index ?? total;
  const position = (currentIndex + (phase === 'on_site' ? ON_SITE_FILL : 0)) / Math.max(total, 1);
  const dot = useSharedValue(position);
  useEffect(() => {
    dot.set(withTiming(position, timing('base', 'move')));
  }, [dot, position]);
  const dotStyle = useAnimatedStyle(() => ({ left: `${dot.get() * 100}%` }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={spoken}
      accessibilityValue={{ min: 0, max: total, now: progress.doneCount }}
      className="gap-8"
    >
      <View className="h-12 justify-center">
        <View className="flex-row gap-4">
          {steps.map((entry) => (
            <View
              key={entry.step.id}
              className="h-4 flex-1 overflow-hidden rounded-pill bg-toast-action"
            >
              <View
                className="h-4 bg-on-strong"
                style={{
                  width:
                    entry.status === 'done' || entry.status === 'skipped'
                      ? '100%'
                      : entry.status === 'current' && phase === 'on_site'
                        ? `${ON_SITE_FILL * 100}%`
                        : '0%',
                  opacity: entry.status === 'skipped' ? 0.45 : 1,
                }}
              />
            </View>
          ))}
        </View>
        {current && (
          <Animated.View
            className="absolute -ml-6 size-12 rounded-pill bg-on-strong"
            style={dotStyle}
          />
        )}
      </View>
      <View className="flex-row flex-wrap justify-between gap-x-12">
        <Text variant="body-s" color="on-strong-muted">
          {start}
        </Text>
        <Text variant="body-s" color="on-strong-muted" className="text-right">
          {end}
        </Text>
      </View>
    </View>
  );
}
