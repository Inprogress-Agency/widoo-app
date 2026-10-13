import type { UiIconKey } from '@widoo/tokens';
import { View } from 'react-native';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

interface InfoTileProps {
  icon: UiIconKey;
  /** « 7 h », « ≈ 40 € », « 6,1 km », « 4 ». */
  value: string;
  /** « Durée », « Par pers. », « Distance », « Étapes ». */
  label: string;
  /** What a screen reader says: « 7 heures, durée », « environ 40 euros par personne ». */
  accessibilityLabel: string;
}

/**
 * Key figure tile of the route sheet (Ecrans › E-05): icon, value and label on warm grey. A dense
 * component, its text capped at 1.3 times; as wide as its content (`flexGrow: 1`, `flexBasis:
 * 'auto'`), so that four tiles hold on one line at large text sizes.
 */
export function InfoTile({ icon, value, label, accessibilityLabel }: InfoTileProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      className="gap-4 rounded-block bg-surface px-8 py-12"
      style={{ flexGrow: 1, flexBasis: 'auto' }}
    >
      <Icon {...uiIcon(icon)} size="icon-m" />
      <Text variant="number-l" isDense>
        {value}
      </Text>
      <Text variant="caption" color="muted" isDense>
        {label}
      </Text>
    </View>
  );
}
