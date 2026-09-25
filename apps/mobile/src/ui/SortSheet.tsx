import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { colors, radius, size } from '@widoo/tokens';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setModalSheetOpen } from './ModalSheetShield';
import { timing } from './motion';
import { Text } from './Text';

export interface SortOption<T extends string> {
  value: T;
  label: string;
  /** « Du plus proche au plus loin ». */
  description: string;
  /**
   * The option cannot be chosen, such as the distance without position: greyed, and this link
   * in place of its description, which offers what it lacks.
   */
  unavailable?: { label: string; onPress: () => void };
}

export interface SortSheetMethods {
  open: () => void;
}

interface SortSheetProps<T extends string> {
  ref?: Ref<SortSheetMethods>;
  /** « Trier par ». */
  title: string;
  /** What a screen reader says of the veil, which closes the sheet. */
  closeLabel: string;
  options: readonly SortOption<T>[];
  value: T;
  /** The choice applies at once and closes the sheet. */
  onChange: (value: T) => void;
}

/**
 * Sheet « Trier par » of the lists (Ecrans › E-04, E-09): a modal sheet over an ink veil at 40 %
 * (M-05), with a radio group; the checked radio is blue. It rises in `page` and closes in `base`
 * `exit`, by a swipe down or a tap on the veil; with « Réduire les animations », it jumps.
 */
export function SortSheet<T extends string>({
  ref,
  title,
  closeLabel,
  options,
  value,
  onChange,
}: SortSheetProps<T>) {
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheetModal>(null);
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  const closeConfig = useBottomSheetTimingConfigs(timing('base', 'move', 'exit'));
  useImperativeHandle(ref, () => ({
    open: () => {
      setModalSheetOpen(true);
      sheet.current?.present();
    },
  }));
  // A screen left with the sheet open, by a back gesture, gives the screen readers back.
  useEffect(() => () => setModalSheetOpen(false), []);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
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

  const choose = (next: T) => {
    onChange(next);
    sheet.current?.dismiss(closeConfig);
  };

  return (
    <BottomSheetModal
      ref={sheet}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      backdropComponent={renderBackdrop}
      backgroundComponent={SheetBackground}
      handleComponent={Handle}
      onDismiss={() => setModalSheetOpen(false)}
      accessible={false}
    >
      <BottomSheetView
        accessibilityViewIsModal
        className="gap-8 px-16 pt-8"
        style={{ paddingBottom: insets.bottom + size['touch-min'] / 2 }}
      >
        <Text variant="title-m" accessibilityRole="header" className="pb-8">
          {title}
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={title}>
          {options.map((option) => (
            <SortRow
              key={option.value}
              option={option}
              isChecked={option.value === value}
              onPress={() => choose(option.value)}
            />
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

interface SortRowProps<T extends string> {
  option: SortOption<T>;
  isChecked: boolean;
  onPress: () => void;
}

/**
 * One radio of the group, its whole row a touch target. An unavailable option is read greyed,
 * and its link is a control of its own.
 */
function SortRow<T extends string>({ option, isChecked, onPress }: SortRowProps<T>) {
  const { unavailable } = option;
  if (unavailable) {
    return (
      <View className="flex-row items-start gap-16 py-10">
        <Radio isChecked={false} isDisabled />
        <View className="flex-1 gap-4">
          <View
            accessible
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: false, disabled: true }}
          >
            <Text variant="item" color="muted">
              {option.label}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unavailable.label}
            onPress={unavailable.onPress}
            className="min-h-touch-min justify-center"
          >
            {/* A link on white: blue, 4.51:1 (Direction-Artistique › Couleurs). */}
            <Text variant="body-s" color="blue">
              {unavailable.label}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${option.label}, ${option.description}`}
      accessibilityState={{ checked: isChecked }}
      onPress={onPress}
      className="min-h-touch-min flex-row items-start gap-16 py-10"
    >
      <Radio isChecked={isChecked} />
      <View className="flex-1 gap-4">
        <Text variant="item">{option.label}</Text>
        <Text variant="body-s" color="muted">
          {option.description}
        </Text>
      </View>
    </Pressable>
  );
}

/** Radio of 24 points, decorative: its row carries the role and the state. */
function Radio({ isChecked, isDisabled = false }: { isChecked: boolean; isDisabled?: boolean }) {
  const ring = isDisabled
    ? 'border-control-border-disabled'
    : isChecked
      ? 'border-blue bg-blue'
      : 'border-control-border';
  return (
    <View className={`size-24 items-center justify-center rounded-pill border-2 ${ring}`}>
      {isChecked && <View className="size-8 rounded-pill bg-bg" />}
    </View>
  );
}

/** Decorative bar: the sheet closes by a swipe down or on the veil. */
function Handle() {
  return (
    <View className="items-center pb-8 pt-12" importantForAccessibility="no-hide-descendants">
      <View className="h-4 w-32 rounded-pill bg-handle" />
    </View>
  );
}

/** White background with the sheet radius, decorative. */
function SheetBackground({ style }: BottomSheetBackgroundProps) {
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
