import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { consent, useConsent } from '../analytics';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

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
      className="mx-16 mt-8 gap-12 rounded-card bg-surface p-16"
      // Height of the window, known at runtime.
      style={{ maxHeight: height * MAX_HEIGHT_RATIO }}
    >
      <ScrollView className="grow-0" contentContainerClassName="gap-12">
        <Text variant="title-s" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body">{body}</Text>
      </ScrollView>
      <View className="flex-row flex-wrap justify-center gap-12">
        <Button label={t('consent.refuse')} onPress={() => consent.set('denied')} />
        <Button label={t('consent.accept')} onPress={() => consent.set('granted')} />
      </View>
    </View>
  );
}
