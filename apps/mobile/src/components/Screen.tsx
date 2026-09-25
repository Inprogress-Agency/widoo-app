import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';

interface ScreenProps {
  /** First heading read by the screen reader. */
  title: string;
  children?: ReactNode;
}

/** Tab screen: title and content scroll together, so that large system text is never cut. */
export function Screen({ title, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    // Safe area measured at runtime.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="gap-16 p-16">
        <Text variant="title-xl" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </ScrollView>
    </View>
  );
}
