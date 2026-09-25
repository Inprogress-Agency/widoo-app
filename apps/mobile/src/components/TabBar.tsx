import { shadow, spacing, type UiIconKey } from '@widoo/tokens';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

// As React Navigation does: VoiceOver does not announce the `tab` role, a button whose selected
// state is read out does the job.
const TAB_ROLE = Platform.OS === 'ios' ? 'button' : 'tab';

/** Interface icon of each tab route: regular, filled when active. */
const icons: Record<string, UiIconKey> = {
  '(home)': 'tab-home',
  routes: 'tab-outings',
  profile: 'tab-profile',
};

/**
 * Tab bar of E-01: a white pill with the only shadow of the app; inactive tabs are warm grey
 * discs showing their icon only, the active tab an ink pill with its blue icon and its label.
 * Labels come from each screen's `title`; the bar is a dense component, capped at 1.3 times.
 */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      className="items-center bg-bg pt-8"
      // Safe area measured at runtime.
      style={{ paddingBottom: Math.max(insets.bottom, spacing['space-12']) }}
    >
      <View
        accessibilityRole="tablist"
        className="flex-row gap-8 rounded-pill bg-bg p-6"
        // Native boxShadow: NativeWind would turn a shadow class into an Android elevation.
        style={{ boxShadow: shadow['shadow-tabbar'] }}
      >
        {state.routes.map((route, index) => {
          const label = descriptors[route.key]?.options.title ?? route.name;
          const icon = icons[route.name];
          const isFocused = state.index === index;
          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole={TAB_ROLE}
              accessibilityLabel={label}
              accessibilityState={{ selected: isFocused }}
              onPress={handlePress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              className={
                isFocused
                  ? 'min-h-button-l-h min-w-button-l-h flex-row items-center justify-center gap-8 rounded-pill bg-surface-strong px-24'
                  : 'min-h-button-l-h min-w-button-l-h items-center justify-center rounded-pill bg-surface'
              }
            >
              {icon && (
                <Icon
                  {...uiIcon(icon, isFocused)}
                  size="space-24"
                  color={isFocused ? 'blue-on-strong' : 'ink'}
                />
              )}
              {isFocused && (
                <Text variant="tab" color="on-strong" isDense>
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
