import { spacing } from '@widoo/tokens';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import { use, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';

interface ScreenProps {
  /** First heading read by the screen reader. */
  title: string;
  children?: ReactNode;
}

/**
 * Screen with a title: title and content scroll together, so that large system text is never
 * cut. In a tab, the content ends above the floating tab bar.
 */
export function Screen({ title, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = use(BottomTabBarHeightContext) ?? 0;
  return (
    // Safe area measured at runtime.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerClassName="gap-16 p-16"
        // Tab bar height measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-16'] + tabBarHeight }}
      >
        <Text variant="title-xl" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </ScrollView>
    </View>
  );
}
