import { colors, type UiIconKey } from '@widoo/tokens';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

interface StatusMessageProps {
  title: string;
  body?: string;
  /** Loading: spinner, and `busy` for screen readers. */
  isBusy?: boolean;
  /** Button under the message (« Réessayer »). */
  action?: ReactNode;
  /** Icon in a warm grey disc above the title, decorative. */
  icon?: UiIconKey;
}

/**
 * Loading, error or offline message, read out when it appears: live region on Android,
 * announcement on iOS (Direction-Artistique › Accessibilité).
 */
export function StatusMessage({ title, body, isBusy = false, action, icon }: StatusMessageProps) {
  const announcement = body ? `${title}. ${body}` : title;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [announcement]);

  return (
    <View className="gap-16 py-24">
      <View
        accessible
        accessibilityLabel={announcement}
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: isBusy }}
        className="items-center gap-8"
      >
        {icon && (
          // 56 points, as Ecrans › E-01 draws it: tokens.json has no size for this disc, the
          // marker's stands in.
          <View className="mb-8 size-marker items-center justify-center rounded-pill bg-surface">
            <Icon {...uiIcon(icon)} size="space-28" />
          </View>
        )}
        {isBusy && <ActivityIndicator color={colors.blue} />}
        <Text variant="title-s" className="text-center">
          {title}
        </Text>
        {body && (
          <Text variant="body" color="muted" className="text-center">
            {body}
          </Text>
        )}
      </View>
      {action}
    </View>
  );
}
