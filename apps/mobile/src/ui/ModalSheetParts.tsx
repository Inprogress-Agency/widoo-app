import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { colors, radius } from '@widoo/tokens';
import { StyleSheet, View } from 'react-native';

/**
 * Parts of a modal sheet (M-05): « Trier par » and the filters panel. The ink veil fades from 0
 * to 40 % as the sheet rises; a tap on it closes the sheet, and a screen reader says so.
 */
export function modalSheetBackdrop(closeLabel: string) {
  return function ModalSheetBackdrop(props: BottomSheetBackdropProps) {
    return (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        // The veil color carries its own 40 %: the backdrop fades it in whole.
        opacity={1}
        style={[props.style, styles.veil]}
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
      />
    );
  };
}

/** Decorative bar: the sheet closes by a swipe down or on the veil. */
export function ModalSheetHandle() {
  return (
    <View className="items-center pb-8 pt-12" importantForAccessibility="no-hide-descendants">
      <View className="h-4 w-32 rounded-pill bg-handle" />
    </View>
  );
}

/** White background with the sheet radius, decorative. */
export function ModalSheetBackground({ style }: BottomSheetBackgroundProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[style, styles.background]}
    />
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: colors.scrim },
  background: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['radius-sheet'],
    borderTopRightRadius: radius['radius-sheet'],
  },
});
