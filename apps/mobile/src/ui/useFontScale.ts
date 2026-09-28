import { useSyncExternalStore } from 'react';
import { Dimensions } from 'react-native';
import { createFontScaleStore } from './fontScale';

const store = createFontScaleStore(Dimensions);

/**
 * Font scale of the system text size, updated when the user changes it with the app open: read it
 * at render time, never once at module level, or a size worked out from it goes stale (#150).
 */
export function useFontScale(): number {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
