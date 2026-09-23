// One import per weight: the package root would bundle all 14 font files.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import '../src/i18n';
import { colors, fonts } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.surface,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: PlusJakartaSans_400Regular,
    [fonts.medium]: PlusJakartaSans_500Medium,
    [fonts.extraBold]: PlusJakartaSans_800ExtraBold,
  });
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
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
