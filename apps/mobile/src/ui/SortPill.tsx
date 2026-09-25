import { size } from '@widoo/tokens';
import { Pressable } from 'react-native';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

// The pill is 36 points high, as a chip: its hit slop brings the touch target to 44 points.
const hitSlop = (size['touch-min'] - size['chip-h']) / 2;

interface SortPillProps {
  /** The current sort: « Recommandé ». */
  label: string;
  /** What a screen reader says: « Trier par, Recommandé ». */
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * Sort pill of the lists (Ecrans › E-04 « Voir tout », E-09): warm grey, 36 points, the sort
 * icon, the current sort and a chevron; it opens the sheet « Trier par ». A dense component: its
 * text is capped at 1.3 times, the pill grows with it rather than cutting it.
 */
export function SortPill({ label, accessibilityLabel, onPress }: SortPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      onPress={onPress}
      className="min-h-chip-h flex-row items-center gap-6 self-start rounded-pill bg-surface px-12 py-6"
    >
      <Icon {...uiIcon('sort')} size="space-16" />
      <Text variant="body-medium" isDense className="shrink">
        {label}
      </Text>
      {/* tokens.json names no chevron for a pill: the caret down of `close-sheet` stands in. */}
      <Icon {...uiIcon('close-sheet')} size="space-16" color="muted" />
    </Pressable>
  );
}
