import type { UiIconKey } from '@widoo/tokens';
import { View } from 'react-native';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

interface TagProps {
  icon: UiIconKey;
  label: string;
  /** What a screen reader says, when the written form is short: « 3 heures » for « 3 h ». */
  accessibilityLabel?: string;
  /** White on a warm grey card, warm grey on white. */
  surface?: 'bg' | 'surface';
}

/**
 * Tag of a card or a summary: an interface icon and a short value (« 3 h », « 4,2 km »). Not a
 * dense component: at large text sizes, the tags of a card wrap on two rows.
 */
export function Tag({ icon, label, accessibilityLabel, surface = 'bg' }: TagProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      className={`min-h-badge-h flex-row items-center gap-6 self-start rounded-pill px-10 py-4 ${surface === 'bg' ? 'bg-bg' : 'bg-surface'}`}
    >
      <Icon {...uiIcon(icon)} size="space-16" />
      <Text variant="label-strong">{label}</Text>
    </View>
  );
}
