import { colors } from '@widoo/tokens';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, View } from 'react-native';
import { Text } from '../ui/Text';

interface StatusMessageProps {
  title: string;
  body?: string;
  /** Loading: spinner, and `busy` for screen readers. */
  isBusy?: boolean;
  /** Button under the message (« Réessayer »). */
  action?: ReactNode;
}

/**
 * Loading, error or offline message, read out when it appears: live region on Android,
 * announcement on iOS (Direction-Artistique › Accessibilité).
 */
export function StatusMessage({ title, body, isBusy = false, action }: StatusMessageProps) {
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
