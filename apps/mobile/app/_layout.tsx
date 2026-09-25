import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { colors } from '@widoo/tokens';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import { useAppOpenedEvent } from '../src/analytics';
import { queryClient } from '../src/api/query-client';
import { holdSplash } from '../src/launch/splash';
import '../src/i18n';
import { initMonitoring } from '../src/monitoring';
import { fonts } from '../src/ui/fonts';

initMonitoring();
// The home lets the launch screen go when it is ready (E-18), 2 s at most.
holdSplash();

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

  if (!isReady) {
    return null;
  }
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
