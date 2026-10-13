import { colors, motion, type UiIconKey } from '@widoo/tokens';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

interface RouteTopBarProps {
  title: string;
  scrollY: SharedValue<number>;
  /** Offset where the photo is gone under the bar: the bar fades in over `barFadeDistancePx`. */
  barStart: number;
  onClose: () => void;
  onShare?: () => void;
  /** No photo (a withdrawn route): the bar is there from the start. */
  isSolid?: boolean;
}

/** Progress of the bar, from 0 on the photo to 1 once it has replaced it (M-10). */
function barProgress(offset: number, barStart: number, isSolid: boolean): number {
  'worklet';
  if (isSolid) {
    return 1;
  }
  return interpolate(
    offset,
    [barStart, barStart + motion.scroll.barFadeDistancePx],
    [0, 1],
    'clamp',
  );
}

function Disc({
  icon,
  label,
  onPress,
  progress,
  isDisabled = false,
}: {
  icon: UiIconKey;
  label: string;
  onPress?: () => void;
  progress: SharedValue<number>;
  isDisabled?: boolean;
}) {
  const background = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.bg, colors.surface]),
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
    >
      {/* Animated tint, out of NativeWind's reach: values from the generated theme. */}
      <Animated.View
        style={background}
        className="size-disc items-center justify-center rounded-pill"
      >
        <Icon {...uiIcon(icon)} size="icon-m" color="ink" />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Top of the route sheet: close, share and favorite on white discs over the photo; once the
 * photo has scrolled away, a white bar takes its place with the title on one line, cut, and the
 * discs on warm grey (M-10, a fade, kept with « Réduire les animations »). The status bar turns
 * dark with it. The title of the bar is read in full, and only once it shows.
 */
export function RouteTopBar({
  title,
  scrollY,
  barStart,
  onClose,
  onShare,
  isSolid = false,
}: RouteTopBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isBarShown, setIsBarShown] = useState(isSolid);
  const progress = useDerivedValue(() => barProgress(scrollY.get(), barStart, isSolid));

  useAnimatedReaction(
    () => progress.get() > 0.5,
    (isShown, wasShown) => {
      if (isShown !== wasShown) {
        scheduleOnRN(setIsBarShown, isShown);
      }
    },
  );
  const bar = useAnimatedStyle(() => ({ opacity: progress.get() }));

  return (
    <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top }]}>
      <StatusBar style={isBarShown ? 'dark' : 'light'} />
      <Animated.View
        pointerEvents="none"
        className="border-line bg-bg"
        style={[StyleSheet.absoluteFill, styles.barBorder, bar]}
      />
      <View className="flex-row items-center gap-12 px-16 py-8">
        <Disc icon="close-sheet" label={t('route.close')} onPress={onClose} progress={progress} />
        <Animated.View
          className="flex-1"
          style={bar}
          accessibilityElementsHidden={!isBarShown}
          importantForAccessibility={isBarShown ? 'auto' : 'no-hide-descendants'}
        >
          <Text variant="title-s" numberOfLines={1} accessibilityLabel={title} isDense>
            {title}
          </Text>
        </Animated.View>
        {onShare && (
          <Disc icon="share" label={t('route.share')} onPress={onShare} progress={progress} />
        )}
        {/* Favorites arrive with accounts (#39): the disc is shown, and disabled. */}
        <Disc icon="favorite" label={t('favorite.add')} progress={progress} isDisabled />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  barBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
});
