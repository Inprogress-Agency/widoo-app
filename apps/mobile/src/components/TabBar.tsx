import type { BottomTabBarProps } from 'expo-router/tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radii, spacing, tabBarShadow, typography } from '../theme';

// As React Navigation does: VoiceOver does not announce the `tab` role, a button whose selected
// state is read out does the job.
const TAB_ROLE = Platform.OS === 'ios' ? 'button' : 'tab';

/** Filled icon of each tab route, as on the E-01 mock-up. */
const icons: Record<string, SymbolViewProps['name']> = {
  index: { ios: 'house.fill', android: 'home', web: 'home' },
  routes: { ios: 'map.fill', android: 'map', web: 'map' },
  profile: { ios: 'person.fill', android: 'person', web: 'person' },
};

/**
 * Tab bar of E-01: a white pill; inactive tabs are warm grey discs showing their icon only, the
 * active tab an ink pill with its blue icon and its label. Labels come from each screen's
 * `title`, capped at 1.3× the font size like every dense component.
 */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {state.routes.map((route, index) => {
          const label = descriptors[route.key]?.options.title ?? route.name;
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
              style={[styles.tab, isFocused ? styles.tabActive : styles.tabIdle]}
            >
              <SymbolView
                name={icons[route.name] ?? 'questionmark'}
                size={22}
                tintColor={isFocused ? colors.tabIconActive : colors.text}
              />
              {isFocused && (
                <Text style={styles.label} maxFontSizeMultiplier={a11y.denseMaxFontSizeMultiplier}>
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

// 52 points: above the 44-point touch target. Heights are minimums so that the label can grow.
const TAB_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    boxShadow: tabBarShadow,
  },
  tab: {
    minWidth: TAB_SIZE,
    minHeight: TAB_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIdle: {
    backgroundColor: colors.surface,
  },
  tabActive: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.inverse,
  },
  label: {
    ...typography.label,
    color: colors.onInverse,
  },
});
