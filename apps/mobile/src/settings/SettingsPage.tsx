import { spacing } from '@widoo/tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../ui/TopBar';

interface SettingsPageProps {
  /** Short, the same as the row of the Réglages; read as the header of the page. */
  title: string;
  /** « Retour aux réglages », for screen readers. */
  backLabel: string;
  children: ReactNode;
}

/**
 * A page of the Réglages (Ecrans › E-19): pushed over the tabs without the tab bar (M-03), the top
 * bar of the Réglages with its back disc, then the page, which scrolls over the safe area.
 */
export function SettingsPage({ title, backLabel, children }: SettingsPageProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg">
      <TopBar title={title} back={{ label: backLabel, onPress: () => router.back() }} />
      <ScrollView
        contentContainerClassName="gap-16 px-16 pt-16"
        keyboardShouldPersistTaps="handled"
        // Safe area measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + insets.bottom }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
