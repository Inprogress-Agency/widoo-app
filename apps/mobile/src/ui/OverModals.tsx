import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';

/**
 * Above every screen, the native modals included: on iOS, the route sheet is a native full
 * screen modal, which would hide a sheet or a toast drawn at the root of the app. A window of its
 * own on iOS, with its own gesture root; Android draws the modals in the same window.
 */
export function OverModals({ children }: PropsWithChildren) {
  if (Platform.OS !== 'ios') {
    return children;
  }
  return (
    <FullWindowOverlay>
      <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </GestureHandlerRootView>
    </FullWindowOverlay>
  );
}
