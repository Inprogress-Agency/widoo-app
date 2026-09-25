import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { consent, useConsent } from '../analytics';
import { colors, radii, spacing, typography } from '../theme';
import { Button } from '../ui/Button';

/**
 * Consent to product analytics, asked at first launch (wiki Securite-et-RGPD). Above the tab
 * bar, it leaves the app usable: no answer means no analytics. Refusing weighs as much as
 * accepting: same button, same place.
 */
export function ConsentBanner() {
  const status = useConsent();
  return status === undefined ? <ConsentPrompt /> : null;
}

// Share of the screen the banner may take: with very large text, the text scrolls and the
// buttons stay visible.
const MAX_HEIGHT_RATIO = 0.6;

function ConsentPrompt() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const title = t('consent.title');
  const body = t('consent.body');

  // Read out when it appears: live region on Android, announcement on iOS.
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(`${title}. ${body}`);
    }
  }, [title, body]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.banner, { maxHeight: height * MAX_HEIGHT_RATIO }]}
    >
      <ScrollView style={styles.text} contentContainerStyle={styles.textContent}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Button label={t('consent.refuse')} onPress={() => consent.set('denied')} />
        <Button label={t('consent.accept')} onPress={() => consent.set('granted')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  text: {
    flexGrow: 0,
  },
  textContent: {
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
