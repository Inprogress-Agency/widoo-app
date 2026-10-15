import { colors, spacing } from '@widoo/tokens';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { openStorePage } from './appUpdate';
import { MARK_BOTTOM_RATIO, UpdateMark } from './UpdateMark';

/**
 * Centre of the W on the reference screen, 350 points from the top of an 844-point iPhone whose
 * safe area starts at 47 (D-065): measured from the safe area, so that its right branch stays
 * clear of the status bar on any phone.
 */
const MARK_CENTER_BELOW_SAFE_TOP = 350 - 47;
/** Least room between the W and the text; closer, the W rises with the text (D-064). */
const MIN_GAP = 24;

/**
 * E-20, update required (Ecrans › E-20, D-063): full screen `blue`, the W of the logo, then the
 * title, the text and « Mettre à jour » to the store. No way out: no close, no back (on Android,
 * back leaves the app). The W stays in place, and rises only as much as large text brings the
 * text within 24 points of it.
 */
export function RequiredUpdateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [textTop, setTextTop] = useState<number | null>(null);
  const restingCenter = insets.top + MARK_CENTER_BELOW_SAFE_TOP;
  const markBottom = restingCenter - width / 2 + width * MARK_BOTTOM_RATIO;
  const rise = textTop === null ? 0 : Math.max(0, markBottom + MIN_GAP - textTop);
  const center = restingCenter - rise;
  // The mark's box is taller than its square: its centre is the centre of the square.
  const markHeight = (width * (1096 + 1120)) / 1096;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.blue }} accessibilityViewIsModal>
      <StatusBar style="light" />
      <View className="absolute" style={{ left: 0, top: center - markHeight / 2 }}>
        <UpdateMark side={width} />
      </View>
      <View
        className="absolute gap-16 px-24"
        style={{ left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + spacing['space-24'] }}
        onLayout={(event) => setTextTop(event.nativeEvent.layout.y)}
      >
        <View className="gap-8">
          <Text variant="title-xl" color="on-blue" accessibilityRole="header">
            {t('update.requiredTitle')}
          </Text>
          <Text variant="body-medium" color="on-blue">
            {t('update.requiredBody')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.update')}
          onPress={openStorePage}
          className="min-h-button-l-h items-center justify-center rounded-pill bg-bg px-24 py-12"
        >
          <Text variant="button-l" color="blue-ink" className="text-center">
            {t('update.update')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
