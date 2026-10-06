import BottomSheet, {
  BottomSheetScrollView,
  type BottomSheetBackgroundProps,
  useBottomSheetSpringConfigs,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { colors, motion, radius } from '@widoo/tokens';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import {
  use,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { ReduceMotion, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../ui/haptics';
import { timing } from '../ui/motion';
import { sheetLevels, sheetSnapPoints, type SheetLevel } from './sheet';
import { SheetHandle } from './SheetHandle';

/**
 * Rest thresholds of the iOS spring of @gorhom/bottom-sheet, which `mappings.motion` takes up
 * without them: with Reanimated's defaults, this stiff spring takes seconds to tell its end, and
 * the detent reached with it.
 */
const springRest = { restDisplacementThreshold: 10, restSpeedThreshold: 10 };

/**
 * How far a drag on the content runs, in points, before it is told vertical, which moves the
 * sheet, or horizontal, which the sheet lets go for the carousel of cards. Without it, the sheet
 * takes a drag in any direction, and on Android react-native-gesture-handler then cancels the
 * native scroll of the carousel. 10 points is the distance a pan of react-native-gesture-handler
 * needs by default on iOS: the sheet keeps the feel it had there.
 */
const DIRECTION_SLOP = 10;
const directionDecision: [number, number] = [-DIRECTION_SLOP, DIRECTION_SLOP];

/** How close to a detent the sheet counts as on it, in detents. */
const DETENT_TOLERANCE = 0.01;

export interface ResultsSheetMethods {
  /** Moves the sheet as the app, in `base`, with no vibration (M-04). */
  moveTo: (level: SheetLevel) => void;
}

interface ResultsSheetProps {
  ref?: Ref<ResultsSheetMethods>;
  /** Height of the screen the sheet lives in, edge to edge behind the floating tab bar. */
  containerHeight: number;
  /** What the rest detent shows whole, under the handle: header, message or summary. */
  peek: ReactNode;
  /** What the sheet shows further up. */
  children?: ReactNode;
  /** The detent reached, and the height the sheet covers there, tab bar included. */
  onLevelChange?: (level: SheetLevel, height: number) => void;
  /** A detent reached by the finger, never by a move of the app. */
  onUserDetent?: (level: SheetLevel) => void;
}

/**
 * The results sheet of E-01 and E-04, with three detents (M-04): it follows the finger and
 * settles on the nearest detent in the direction of the gesture, with the spring of
 * `mappings.motion`, the same on iOS and Android, and a selection vibration at each detent
 * reached by the finger. Moved by the app, it takes `base`. With « Réduire les animations », it
 * jumps to its detent. It runs down to the foot of the screen, under the floating tab bar: its
 * detents are counted above the bar, and its content scrolls clear of it.
 */
export function ResultsSheet({
  ref,
  containerHeight,
  peek,
  children,
  onLevelChange,
  onUserDetent,
}: ResultsSheetProps) {
  const insets = useSafeAreaInsets();
  const barHeight = use(BottomTabBarHeightContext) ?? 0;
  const sheet = useRef<BottomSheet>(null);
  const [peekHeight, setPeekHeight] = useState(0);
  const [level, setLevel] = useState<SheetLevel>('rest');
  /** The detent the app is moving the sheet to: no vibration on the way, nor on arrival. */
  const appTarget = useRef<number | null>(null);
  const animatedIndex = useSharedValue(0);
  /** The last detent the sheet reached, the rest detent where it opens. */
  const reachedIndex = useSharedValue(0);

  const snapPoints = useMemo(
    () => sheetSnapPoints({ containerHeight, barHeight, topInset: insets.top, peekHeight }),
    [containerHeight, barHeight, insets.top, peekHeight],
  );
  // Explicit on both systems: @gorhom/bottom-sheet springs on iOS and times 250 ms on Android.
  const gestureConfig = useBottomSheetSpringConfigs({
    ...motion.springGesture,
    ...springRest,
    reduceMotion: ReduceMotion.System,
  });
  const appMoveConfig = useBottomSheetTimingConfigs(timing('base', 'move'));

  const moveTo = (next: SheetLevel) => {
    if (next === level) {
      return;
    }
    appTarget.current = sheetLevels.indexOf(next);
    sheet.current?.snapToIndex(appTarget.current, appMoveConfig);
  };
  useImperativeHandle(ref, () => ({ moveTo }));

  const handleDetent = (index: number) => {
    const next = sheetLevels[index];
    if (!next) {
      return;
    }
    if (appTarget.current === null) {
      haptic('sheetDetent');
      onUserDetent?.(next);
    } else if (appTarget.current === index) {
      appTarget.current = null;
    }
    setLevel(next);
  };

  // The detent is read from the position of the sheet, each time it reaches one: released right
  // on a detent, such as the finger past the top, the sheet does not animate, and @gorhom's
  // `onChange` never comes. A drag through a detent reaches it too, and vibrates there.
  useAnimatedReaction(
    () => {
      const index = animatedIndex.get();
      const detent = Math.round(index);
      return Math.abs(index - detent) < DETENT_TOLERANCE ? detent : null;
    },
    (detent) => {
      if (detent !== null && detent !== reachedIndex.get()) {
        reachedIndex.set(detent);
        scheduleOnRN(handleDetent, detent);
      }
    },
  );

  // Told again when the detent changes height, such as the rest detent around a summary.
  const coveredHeight = snapPoints[sheetLevels.indexOf(level)];
  useEffect(() => {
    if (coveredHeight !== undefined) {
      onLevelChange?.(level, coveredHeight);
    }
  }, [level, coveredHeight, onLevelChange]);

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      animationConfigs={gestureConfig}
      overrideReduceMotion={ReduceMotion.System}
      animatedIndex={animatedIndex}
      // The sheet only takes a vertical drag: a horizontal one is the carousel's.
      activeOffsetY={directionDecision}
      failOffsetX={directionDecision}
      handleComponent={null}
      // The sheet is not one element: the handle is its adjustable part, its content is read.
      accessible={false}
      backgroundComponent={SheetBackground}
      // The field of the search (E-02) takes the sheet to full with the keyboard (M-04); the
      // sheet stays there when the keyboard closes, for the results to be read.
      keyboardBehavior="extend"
      keyboardBlurBehavior="none"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        // Tab bar height measured at runtime: the end of the content scrolls above the bar.
        contentContainerStyle={{ paddingBottom: barHeight }}
        // Scrolling hides the keyboard; a tap on a row reaches the row (Ecrans › E-02).
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View onLayout={(event) => setPeekHeight(event.nativeEvent.layout.height)}>
          <SheetHandle level={level} onLevel={moveTo} />
          {peek}
        </View>
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

/**
 * White background with the sheet radius. Decorative: the default one of @gorhom/bottom-sheet is
 * a second adjustable element, read « Bottom Sheet » in English.
 */
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
  background: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['radius-sheet'],
    borderTopRightRadius: radius['radius-sheet'],
  },
});
