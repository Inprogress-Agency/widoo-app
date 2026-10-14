import { shadow, size, spacing, toast as toastTokens } from '@widoo/tokens';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useStore } from 'zustand';
import { Icon } from './Icon';
import { timing } from './motion';
import { OverModals } from './OverModals';
import { Text } from './Text';
import { hideToast, toastDurationMs, toastStore, type ToastMessage } from './toastStore';

/** How far the toast rises as it appears (M-06). */
const RISE = spacing['space-16'];

/**
 * Host of the toasts, at the root of the app over the modal sheets: one at a time, at the bottom,
 * centred, as wide as its text (358 points at most).
 */
export function ToastHost() {
  const toast = useStore(toastStore, (state) => state.toast);
  const insets = useSafeAreaInsets();
  if (!toast) {
    return null;
  }
  // The window above the native modals exists only while a toast shows.
  return (
    <OverModals>
      <View
        pointerEvents="box-none"
        className="absolute items-center px-16"
        style={{ left: 0, right: 0, bottom: insets.bottom + size['touch-min'] / 2 }}
      >
        <Toast key={toast.id} toast={toast} />
      </View>
    </OverModals>
  );
}

/**
 * A toast of `mappings.toast` (M-06): ink pill, icon on a glass disc; it rises 16 points as it
 * fades in (`base`), stays its time, fades out in place (`fade`), and goes by a swipe down. With
 * « Réduire les animations », the rise jumps and the fades remain. Told by the screen readers
 * without moving their focus.
 */
function Toast({ toast }: { toast: ToastMessage }) {
  const state = toastTokens.states[toast.kind];
  const opacity = useSharedValue(0);
  const rise = useSharedValue<number>(RISE);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: rise.get() }],
  }));

  useEffect(() => {
    opacity.set(withTiming(1, timing('base', 'fade')));
    rise.set(withTiming(0, timing('base', 'move')));
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(toast.title);
    }
    const duration = toastDurationMs(toast.kind);
    if (duration === null) {
      return;
    }
    const timer = setTimeout(() => {
      opacity.set(
        withTiming(0, timing('fade', 'fade'), (isFinished) => {
          if (isFinished) {
            scheduleOnRN(hideToast, toast.id);
          }
        }),
      );
    }, duration);
    return () => clearTimeout(timer);
  }, [opacity, rise, toast]);

  const swipe = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 0) {
      scheduleOnRN(hideToast, toast.id);
    }
  });

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        accessible
        accessibilityRole={state.role === 'alert' ? 'alert' : 'text'}
        accessibilityLabel={toast.title}
        accessibilityLiveRegion={state.role === 'alert' ? 'assertive' : 'polite'}
        className="max-w-card-list-w flex-row items-center gap-10 rounded-pill bg-surface-strong py-8 pl-8 pr-16"
        // Native boxShadow: NativeWind would turn a shadow class into an Android elevation.
        style={[{ boxShadow: shadow[toastTokens.shadow] }, style]}
      >
        <View className="size-touch-min items-center justify-center rounded-pill bg-toast-disc">
          <Icon name={state.icon} weight="fill" color={state.color} size="icon-m" />
        </View>
        <Text variant="item" color="on-strong" isDense className="shrink">
          {toast.title}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
