import { shadow, size, spacing, toast as toastTokens } from '@widoo/tokens';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useStore } from 'zustand';
import { haptic } from './haptics';
import { Icon } from './Icon';
import { timing } from './motion';
import { OverModals } from './OverModals';
import { Text } from './Text';
import {
  hideToast,
  toastAnnouncement,
  toastDurationMs,
  toastStore,
  type ToastKind,
  type ToastMessage,
} from './toastStore';

/** How far the toast rises as it appears (M-06). */
const RISE = spacing['space-16'];

/** The toasts that vibrate (`mappings.motion.haptics`); nothing else does. */
const hapticOfKind: Partial<Record<ToastKind, 'toastSuccess' | 'toastError'>> = {
  success: 'toastSuccess',
  error: 'toastError',
};

/**
 * Host of the toasts, at the root of the app over the modal sheets: one at a time, at the bottom,
 * centred, as wide as its text (358 points at most); over the tab bar for a toast of a tab.
 */
export function ToastHost() {
  const toast = useStore(toastStore, (state) => state.toast);
  const tabBarHeight = useStore(toastStore, (state) => state.tabBarHeight);
  const insets = useSafeAreaInsets();
  if (!toast) {
    return null;
  }
  const bottom = toast.isAboveTabBar
    ? tabBarHeight + spacing['space-8']
    : insets.bottom + size['touch-min'] / 2;
  // The window above the native modals exists only while a toast shows.
  return (
    <OverModals>
      <View
        pointerEvents="box-none"
        className="absolute items-center px-16"
        style={{ left: 0, right: 0, bottom }}
      >
        <Toast key={toast.id} toast={toast} />
      </View>
    </OverModals>
  );
}

/**
 * A toast of `mappings.toast` (M-06): ink pill, icon on a glass disc, title, subtitle and action
 * in a small pill; all of it a dense component, capped at 1.3 times (D-046), on several lines in
 * 358 points when needed. It rises 16 points as it fades in (`base`), stays its time, fades out in
 * place (`fade`), and goes by a swipe down. With « Réduire les animations », the rise jumps and
 * the fades remain. Told by the screen readers without moving their focus, its action reachable.
 */
export function Toast({ toast }: { toast: ToastMessage }) {
  const state = toastTokens.states[toast.kind];
  const opacity = useSharedValue(0);
  const rise = useSharedValue<number>(RISE);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: rise.get() }],
  }));
  const announcement = toastAnnouncement(toast);

  useEffect(() => {
    opacity.set(withTiming(1, timing('base', 'fade')));
    rise.set(withTiming(0, timing('base', 'move')));
    const vibration = hapticOfKind[toast.kind];
    if (vibration) {
      haptic(vibration);
    }
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announcement);
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
  }, [announcement, opacity, rise, toast]);

  const swipe = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 0) {
      scheduleOnRN(hideToast, toast.id);
    }
  });

  const { action } = toast;
  const handleAction = () => {
    hideToast(toast.id);
    action?.onPress();
  };

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        className={`max-w-card-list-w flex-row items-center gap-10 bg-surface-strong py-8 pl-8 ${action ? 'pr-8' : 'pr-16'} ${toast.subtitle ? 'rounded-sheet' : 'rounded-pill'}`}
        // Native boxShadow: NativeWind would turn a shadow class into an Android elevation.
        style={[{ boxShadow: shadow[toastTokens.shadow] }, style]}
      >
        <View
          accessible
          accessibilityRole={state.role === 'alert' ? 'alert' : 'text'}
          accessibilityLabel={announcement}
          accessibilityLiveRegion={state.role === 'alert' ? 'assertive' : 'polite'}
          className="shrink flex-row items-center gap-10"
        >
          <View className="size-touch-min items-center justify-center rounded-pill bg-toast-disc">
            <Icon name={state.icon} weight="fill" color={state.color} size="icon-m" />
          </View>
          <View className="shrink">
            <Text variant="item" color="on-strong" isDense>
              {toast.title}
            </Text>
            {toast.subtitle && (
              <Text variant="label" color="on-strong-muted" isDense>
                {toast.subtitle}
              </Text>
            )}
          </View>
        </View>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={handleAction}
            className="min-h-touch-min items-center justify-center rounded-pill bg-toast-action px-16"
          >
            <Text variant="label-strong" color="on-strong" isDense>
              {action.label}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
