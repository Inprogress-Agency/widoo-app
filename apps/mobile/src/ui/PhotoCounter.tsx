import { View } from 'react-native';
import { Text } from './Text';

/**
 * « 1 / 6 » on a photo carousel: white on the ink veil (5.03:1, even on a white photo). A dense
 * component; hidden from screen readers, the carousel says « Photo 1 sur 6 » itself.
 */
export function PhotoCounter({ index, count }: { index: number; count: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="min-h-badge-h justify-center self-start rounded-pill bg-photo-veil px-10"
    >
      <Text variant="status" color="on-strong" isDense>
        {`${index + 1} / ${count}`}
      </Text>
    </View>
  );
}
