import type { IconName } from '@widoo/tokens';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { TextLink } from './TextLink';

interface StatusLineProps {
  icon: IconName;
  text: string;
  /** Link on the right: « Modifier ». */
  action?: { label: string; accessibilityLabel?: string; onPress: () => void };
}

/**
 * A lasting state line (planche 2 de E-09, lignes d'état): icon of 16, text of 13 in `muted`, a
 * blue link on the right; told to screen readers as a status, never a toast.
 */
export function StatusLine({ icon, text, action }: StatusLineProps) {
  return (
    <View className="flex-row items-start gap-8">
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={text}
        accessibilityLiveRegion="polite"
        className="flex-1 flex-row items-center gap-8"
      >
        <Icon name={icon} size="icon-s" color="muted" />
        <Text variant="status" color="muted" className="flex-1">
          {text}
        </Text>
      </View>
      {action && (
        <TextLink
          label={action.label}
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
        />
      )}
    </View>
  );
}
