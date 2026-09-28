import { shadow, spacing, type UiIconKey } from '@widoo/tokens';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/tabs';
import { use, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

// As React Navigation does: VoiceOver does not announce the `tab` role, a button whose selected
// state is read out does the job.
const TAB_ROLE = Platform.OS === 'ios' ? 'button' : 'tab';

/** Interface icon of each tab route: regular, filled when active. */
const icons: Record<string, UiIconKey> = {
  index: 'tab-home',
  routes: 'tab-outings',
  profile: 'tab-profile',
};

interface TabBarProps extends BottomTabBarProps {
  /** Floats with the bar, just above the pill, such as the consent banner. */
  accessory?: ReactNode;
}

/**
 * Tab bar of E-01: a white pill with the only shadow of the app, floating over the screens,
 * which run edge to edge behind it (the map of E-01). Inactive tabs are warm grey discs showing
 * their icon only, the active tab an ink pill with its blue icon and its label. Labels come from
 * each screen's `title`; the bar is a dense component, capped at 1.3 times. Its height, pill and
 * accessory, is what the screens read as the tab bar height, to keep their content above it.
 */
export function TabBar({ state, descriptors, navigation, insets, accessory }: TabBarProps) {
  const onHeightChange = use(BottomTabBarHeightCallbackContext);
  return (
    <View
      pointerEvents="box-none"
      className="items-center gap-8"
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      // Safe area measured at runtime.
      style={[styles.floating, { paddingBottom: Math.max(insets.bottom, spacing['space-12']) }]}
    >
      {accessory}
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
                  size="icon-l"
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

const styles = StyleSheet.create({
  floating: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
