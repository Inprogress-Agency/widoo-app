import {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { size } from '@widoo/tokens';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  useWindowDimensions,
  View,
  type Text as NativeText,
} from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analytics, useConsent } from '../analytics';
import { Button } from '../ui/Button';
import { ModalSheetBackdrop, ModalSheetBackground } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';

/** The veil does not close it: a choice is asked, and the veil is not told. */
function LockedBackdrop(props: BottomSheetBackdropProps) {
  return <ModalSheetBackdrop {...props} closeLabel="" pressBehavior="none" />;
}

/** Without a handle, its room kept: the sheet does not close by a swipe (E-18). */
function NoHandle() {
  return <View className="h-24" />;
}

/** The escape gesture of iOS, handled so that it closes nothing: a choice is asked. */
const ignoreEscape = () => {};

/**
 * « Mesure d'audience » (Ecrans › E-18, D-060, D-061): at the first launch, once the home is
 * loaded, centred on the user or on Paris, a sheet over the home and its tab bar. No handle, and
 * neither a swipe, nor the veil, nor back on Android, nor the escape gesture closes it: « Refuser »
 * and « Accepter », of the same size, are the only ways out. Until then, nothing is sent but the
 * crash reports. Never over an error, offline, or the position request: it waits for a loaded
 * home, at this launch or the next. The privacy policy opens over the home; the sheet steps
 * aside meanwhile and comes back with the home.
 */
export function ConsentSheet({ isHomeReady }: { isHomeReady: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = useRef<BottomSheetModal>(null);
  const title = useRef<NativeText>(null);
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  const closeConfig = useBottomSheetTimingConfigs(timing('base', 'move', 'exit'));
  const isFocused = useIsFocused();
  const isUnanswered = useConsent() === undefined;
  const isDue = isHomeReady && isFocused && isUnanswered;

  const wasPresented = useRef(false);
  useEffect(() => {
    if (isDue) {
      wasPresented.current = true;
      setModalSheetOpen(true);
      sheet.current?.present();
      return;
    }
    // Never before a first opening: the sheet would no longer present afterwards (gorhom).
    if (wasPresented.current) {
      wasPresented.current = false;
      setModalSheetOpen(false);
      sheet.current?.dismiss(closeConfig);
    }
  }, [isDue, closeConfig]);

  useEffect(() => {
    if (!isDue) {
      return;
    }
    // Back on Android closes nothing either: it would leave the app with no answer.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isDue]);

  // A home left with the sheet open gives the screen readers back.
  useEffect(() => () => setModalSheetOpen(false), []);

  /** Screen readers start on the title once the sheet is up (D-061). */
  const focusTitle = (index: number) => {
    const node = index >= 0 && title.current && findNodeHandle(title.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  };

  return (
    <BottomSheetModal
      ref={sheet}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      enablePanDownToClose={false}
      // Larger text: it grows up to the top of the screen, then its text scrolls (D-061).
      maxDynamicContentSize={height - insets.top}
      backdropComponent={LockedBackdrop}
      backgroundComponent={ModalSheetBackground}
      handleComponent={NoHandle}
      onChange={focusTitle}
      accessible={false}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + size['touch-min'] / 2 }}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={ignoreEscape}
          className="gap-16 px-16"
        >
          <View className="gap-8">
            <Text ref={title} variant="title-l" accessibilityRole="header">
              {t('consent.title')}
            </Text>
            <Text variant="body">{t('consent.body')}</Text>
            <Text variant="body-s" color="muted">
              {t('consent.changeLater')}
            </Text>
          </View>
          {/* The policy kept in the app, offline too (E-19, D-063). */}
          <TextLink
            label={t('settings.privacyPolicy')}
            color="blue-ink"
            onPress={() =>
              router.push({ pathname: '/settings/privacy-policy', params: { from: 'home' } })
            }
          />
          {/* Side by side at every text size, « Accepter » on the right (E-18, D-061). */}
          <View className="flex-row gap-12">
            <View className="flex-1">
              <Button
                label={t('consent.refuse')}
                variant="secondary"
                isFullWidth
                onPress={analytics.refuse}
              />
            </View>
            <View className="flex-1">
              <Button label={t('consent.accept')} isFullWidth onPress={analytics.accept} />
            </View>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
