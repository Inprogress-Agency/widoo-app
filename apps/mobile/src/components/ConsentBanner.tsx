import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { consent, useConsent } from '../analytics';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

/**
 * Consent to product analytics, asked at first launch (wiki Securite-et-RGPD). Floating with the
 * tab bar, just above it, it leaves the app usable: no answer means no analytics. Refusing weighs as much as
 * accepting: same button, same place.
 */
export function ConsentBanner() {
  const status = useConsent();
  return status === undefined ? <ConsentPrompt /> : null;
}

// Share of the screen the text may take: with very large text, it scrolls and the buttons stay
// visible. The cap is on the text, not on the banner: the banner is as tall as its text and its
// buttons, with nothing to shrink, so its buttons never spill out of it (#293).
const TEXT_MAX_HEIGHT_RATIO = 0.4;

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
      // In front of the tab bar pill, drawn and touched first: the pill never covers the buttons,
      // the only way out of the banner (#293).
      className="z-10 mx-16 gap-12 self-stretch rounded-card bg-surface p-16"
    >
      <ScrollView
        className="grow-0"
        contentContainerClassName="gap-12"
        // Height of the window, known at runtime.
        style={{ maxHeight: height * TEXT_MAX_HEIGHT_RATIO }}
      >
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
