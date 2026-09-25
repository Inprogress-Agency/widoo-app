import type { Mood } from '@widoo/shared';
import { colors, moodDots } from '@widoo/tokens';
import { View } from 'react-native';

/** 8-point dot before « ambiance · quartier »: decorative, the mood name follows (D-016). */
export function MoodDot({ mood }: { mood: Mood }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      className="size-8 rounded-pill"
      style={{ backgroundColor: colors[moodDots[mood]] }}
    />
  );
}
