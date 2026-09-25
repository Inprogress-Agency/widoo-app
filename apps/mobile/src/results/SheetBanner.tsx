import { size, type UiIconKey } from '@widoo/tokens';
import { Pressable, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

// The link text is shorter than a finger: its hit slop brings it to 44 points.
const linkHitSlop = size['touch-min'] / 4;

interface SheetBannerProps {
  icon: UiIconKey;
  text: string;
  /** Link at the end of the line, such as « Activer ». */
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
}

/**
 * Warm grey line under the handle of the sheet (Ecrans › E-01): offline with the time of the
 * results, or position off with « Activer ». Read out when it appears; it grows with the text.
 */
export function SheetBanner({ icon, text, action }: SheetBannerProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mx-16 mb-8 min-h-touch-min flex-row items-center gap-8 rounded-block bg-surface px-12 py-8"
    >
      <Icon {...uiIcon(icon)} size="space-16" color="muted" />
      <Text variant="label" color="muted" className="flex-1">
        {text}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          hitSlop={linkHitSlop}
          onPress={action.onPress}
        >
          <Text variant="label-strong" color="blue-ink">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
