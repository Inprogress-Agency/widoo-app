import {
  BottomSheetBackdrop,
  useBottomSheet,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { colors, radius } from '@widoo/tokens';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface ModalSheetBackdropProps extends BottomSheetBackdropProps {
  closeLabel: string;
  /**
   * `none`: a step that must be gone through, the veil does not close it and is not told
   * (E-10, prénom).
   */
  pressBehavior?: 'close' | 'none';
}

/**
 * Parts of a modal sheet (M-05): « Trier par » and the filters panel. The ink veil fades from 0
 * to 40 % as the sheet rises; a tap on it closes the sheet, and a screen reader says so.
 *
 * The tap is the veil's own gesture, which reads the behavior when it ends: the backdrop of
 * gorhom drops its gesture for `none`, and its veil, mounted anew, would then cover the sheet; a
 * snap in place would leave the keyboard over the sheet.
 */
export function ModalSheetBackdrop({
  closeLabel,
  pressBehavior = 'close',
  ...props
}: ModalSheetBackdropProps) {
  const { close } = useBottomSheet();
  const isClosing = pressBehavior === 'close';
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (isClosing) {
        close();
      }
    });
  return (
    <GestureDetector gesture={tap}>
      <BottomSheetBackdrop
        {...props}
        pressBehavior="none"
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        // The veil color carries its own 40 %: the backdrop fades it in whole.
        opacity={1}
        style={[props.style, styles.veil]}
        accessible={isClosing}
        accessibilityLabel={isClosing ? closeLabel : undefined}
        accessibilityRole={isClosing ? 'button' : undefined}
        accessibilityHint=""
      />
    </GestureDetector>
  );
}

/** The veil of a sheet that always closes on a tap, as `backdropComponent`. */
export function modalSheetBackdrop(closeLabel: string) {
  return function ClosingBackdrop(props: BottomSheetBackdropProps) {
    return <ModalSheetBackdrop {...props} closeLabel={closeLabel} />;
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
