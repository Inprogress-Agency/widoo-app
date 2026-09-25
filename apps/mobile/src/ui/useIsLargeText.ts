import { accessibility } from '@widoo/tokens';
import { useWindowDimensions } from 'react-native';

/**
 * True from 130 % of system text: the threshold of the two reflows of the app, the map tooltip
 * and the route summary (Direction-Artistique › Accessibilité). Nothing else branches on it.
 */
export function useIsLargeText(): boolean {
  return useWindowDimensions().fontScale >= accessibility.reflowFontScale;
}
