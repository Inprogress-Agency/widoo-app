import { useEffect, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, typography } from '../theme';

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
    <View style={styles.container}>
      <View
        accessible
        accessibilityLabel={announcement}
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: isBusy }}
        style={styles.message}
      >
        {isBusy && <ActivityIndicator color={colors.primary} />}
        <Text style={styles.title}>{title}</Text>
        {body && <Text style={styles.body}>{body}</Text>}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  message: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
