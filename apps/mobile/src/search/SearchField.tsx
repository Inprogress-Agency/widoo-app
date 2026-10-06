import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors, size, spacing, textStyles } from '@widoo/tokens';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useIsLargeText } from '../ui/useIsLargeText';

// The link text is shorter than a finger: its hit slop brings it to 44 points.
const linkHitSlop = size['touch-min'] / 4;

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  /** « Annuler »: the sheet goes back down, nothing changed. */
  onCancel: () => void;
  /** A request runs: the blue ring takes the place of the cross. */
  isLoading: boolean;
  /** « 2 zones, 3 parcours », told once the groups answered; null meanwhile. */
  resultsAnnouncement: string | null;
}

/**
 * Field of the search (Ecrans › E-02): a warm grey field of 48 points at least, which grows with
 * the text, the magnifier, the hint « Quartier, station ou parcours » (« Zone ou parcours » from
 * 130 % of system text), the cross while typing or the blue ring of a request, and the blue link
 * « Annuler ». It takes the focus on opening: the keyboard opens with the sheet at full (M-04).
 */
export function SearchField({
  value,
  onChangeText,
  onCancel,
  isLoading,
  resultsAnnouncement,
}: SearchFieldProps) {
  const { t } = useTranslation();
  const isLargeText = useIsLargeText();
  const announcement = isLoading ? t('search.loading') : resultsAnnouncement;

  // Screen readers hear the request, then its results (Ecrans › E-02, lecteur d'écran):
  // announced on iOS, through the live region below on Android.
  useEffect(() => {
    if (Platform.OS === 'ios' && announcement) {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [announcement]);

  return (
    <View className="flex-row items-center gap-12 px-16 pb-8">
      <View className="min-h-button-h flex-1 flex-row items-center gap-8 rounded-pill bg-surface pl-16 pr-4">
        <Icon {...uiIcon('search')} size="icon-l" />
        <BottomSheetTextInput
          autoFocus
          value={value}
          onChangeText={onChangeText}
          placeholder={isLargeText ? t('search.placeholderShort') : t('search.placeholder')}
          placeholderTextColor={colors.muted}
          accessibilityRole="search"
          accessibilityLabel={t('search.fieldLabel')}
          accessibilityState={{ busy: isLoading }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={100}
          style={styles.input}
        />
        {isLoading ? (
          <View className="size-touch-min items-center justify-center">
            <ActivityIndicator color={colors.blue} />
          </View>
        ) : (
          value.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('search.clear')}
              onPress={() => onChangeText('')}
              className="size-touch-min items-center justify-center"
            >
              <Icon {...uiIcon('clear')} color="muted" />
            </Pressable>
          )
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('search.cancelLabel')}
        hitSlop={linkHitSlop}
        onPress={onCancel}
      >
        <Text variant="button" color="blue">
          {t('search.cancel')}
        </Text>
      </Pressable>
      {Platform.OS === 'android' && (
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={announcement ?? ''}
          className="absolute size-4"
          pointerEvents="none"
        />
      )}
    </View>
  );
}

// The text style of the input, without its line height: iOS shifts the text of a single-line
// input that has one.
const { fontFamily, fontSize } = textStyles.body;
const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontFamily,
    fontSize,
    color: colors.ink,
    paddingVertical: spacing['space-10'],
  },
});
