import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@widoo/tokens';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import '../global.css';
import { useAppOpenedEvent } from '../src/analytics';
import { persistOptions } from '../src/api/persister';
import { queryClient } from '../src/api/query-client';
import '../src/i18n';
import { initMonitoring } from '../src/monitoring';
import { fonts } from '../src/ui/fonts';

initMonitoring();
void SplashScreen.preventAutoHideAsync();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.blue,
    background: colors.bg,
    card: colors.bg,
    text: colors.ink,
    border: colors.surface,
  },
};

export default function RootLayout() {
  useAppOpenedEvent();
  const [fontsLoaded, fontError] = useFonts(fonts);
  // A font that fails to load falls back to the system font rather than blocking the app.
  const isReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }
  return (
    // The last search is restored from the device, for the results offline (Ecrans › E-01).
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* The route sheet rises from the bottom (M-02). */}
          <Stack.Screen
            name="route/[id]"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
