import {
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { size } from '@widoo/tokens';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import appIcon from '../../assets/icon.png';
import { consent } from '../analytics';
import { Button } from '../ui/Button';
import { ModalSheetBackground, ModalSheetHandle, modalSheetBackdrop } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { Text } from '../ui/Text';
import { openStorePage, recommendedMemory, useAppUpdate } from './appUpdate';

/**
 * Whether the consent sheet of the first launch was already answered when the app started: until
 * then the update waits for the next launch, never over it (Ecrans › E-20).
 */
const wasConsentAnsweredAtLaunch = consent.get() !== undefined;

/** The app icon of the sheet, its corners as iOS draws them (22.37 % of the side). */
const ICON_SIDE = 64;
const ICON_RADIUS = ICON_SIDE * 0.2237;

/**
 * E-20, update recommended (Ecrans › E-20, D-063): on the loaded home, a sheet that closes,
 * once per recommended version. Swiping it down, touching the veil or the escape gesture is
 * « Plus tard ».
 */
export function RecommendedUpdateSheet({ isHomeReady }: { isHomeReady: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheetModal>(null);
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  const closeConfig = useBottomSheetTimingConfigs(timing('base', 'move', 'exit'));
  const { update, recommendedVersion } = useAppUpdate();
  const isDue =
    isHomeReady &&
    wasConsentAnsweredAtLaunch &&
    update === 'recommended' &&
    recommendedVersion !== null &&
    !recommendedMemory.isOffered(recommendedVersion);

  useEffect(() => {
    if (!isDue || recommendedVersion === null) {
      return;
    }
    recommendedMemory.setOffered(recommendedVersion);
    setModalSheetOpen(true);
    sheet.current?.present();
  }, [isDue, recommendedVersion]);
  useEffect(() => () => setModalSheetOpen(false), []);

  const later = () => sheet.current?.dismiss(closeConfig);

  return (
    <BottomSheetModal
      ref={sheet}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      backdropComponent={modalSheetBackdrop(t('update.later'))}
      backgroundComponent={ModalSheetBackground}
      handleComponent={ModalSheetHandle}
      onDismiss={() => setModalSheetOpen(false)}
      accessible={false}
    >
      <BottomSheetView
        accessibilityViewIsModal
        onAccessibilityEscape={later}
        className="items-center gap-16 px-16 pt-8"
        style={{ paddingBottom: insets.bottom + size['touch-min'] / 2 }}
      >
        <Image
          source={appIcon}
          style={{ width: ICON_SIDE, height: ICON_SIDE, borderRadius: ICON_RADIUS }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <View className="items-center gap-8">
          <Text variant="title-m" accessibilityRole="header" className="text-center">
            {t('update.recommendedTitle')}
          </Text>
          <Text variant="body" color="muted" className="text-center">
            {t('update.recommendedBody')}
          </Text>
        </View>
        <View className="gap-4 self-stretch">
          <Button
            label={t('update.update')}
            isFullWidth
            onPress={() => {
              openStorePage();
              later();
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={later}
            className="min-h-button-h items-center justify-center"
          >
            <Text variant="button" color="ink">
              {t('update.later')}
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
