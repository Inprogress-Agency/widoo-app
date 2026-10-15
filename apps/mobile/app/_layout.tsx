import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { colors, motion } from '@widoo/tokens';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import '../global.css';
import { useAppOpenedEvent } from '../src/analytics';
import { signInFlow } from '../src/auth/signIn';
import { SignInSheet } from '../src/auth/SignInSheet';
import { persistOptions } from '../src/api/persister';
import { queryClient } from '../src/api/query-client';
import { holdSplash } from '../src/launch/splash';
import '../src/i18n/language';
import { initMonitoring } from '../src/monitoring';
import { fonts } from '../src/ui/fonts';
import { ToastHost } from '../src/ui/Toast';

initMonitoring();
// The home lets the launch screen go when it is ready (E-18), 2 s at most.
holdSplash();

/** The pages of the Réglages under `app/settings/` (E-19), pushed like Langue. */
const settingsPages = ['notifications', 'terms', 'privacy-policy'] as const;

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
  const isReducedMotion = useReducedMotion();
  // M-03, the pages pushed over the tabs: the iOS push, taken up on Android (`mappings.motion.page`).
  const pageOptions = {
    animation: isReducedMotion
      ? ('fade' as const)
      : Platform.OS === 'android'
        ? ('ios_from_right' as const)
        : ('default' as const),
    animationDuration: isReducedMotion ? motion.durations.fade : motion.durations.page,
  };
  const [fontsLoaded, fontError] = useFonts(fonts);
  // A font that fails to load falls back to the system font rather than blocking the app.
  const isReady = fontsLoaded || fontError !== null;

  if (!isReady) {
    return null;
  }
  return (
    // The last search is restored from the device, for the results offline (Ecrans › E-01).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="dark" />
          {/* Modal sheets, such as « Trier par », rise over the tab bar. */}
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              {/*
                The route sheet rises from the bottom over the tabs, full screen (M-02, the
                fallback of M-01 that the ticket accepts): `page` and the standard curve; with
                « Réduire les animations », a fade in place. It closes by sliding down, its own pan.
              */}
              <Stack.Screen
                name="route/[id]"
                options={{
                  presentation: 'fullScreenModal',
                  // `mappings.motion.modal.animation`, which the generated theme does not carry.
                  animation: isReducedMotion ? 'fade' : 'slide_from_bottom',
                  animationDuration: isReducedMotion
                    ? motion.durations.fade
                    : motion.durations.page,
                }}
              />
              {/*
                Modifier le profil, Supprimer mon compte (E-09) and Langue (E-19): pages without
                the tab bar.
              */}
              <Stack.Screen name="edit-profile" options={pageOptions} />
              <Stack.Screen name="delete-account" options={pageOptions} />
              <Stack.Screen name="language" options={pageOptions} />
              {/* The other pages of the Réglages (E-19). */}
              {settingsPages.map((page) => (
                <Stack.Screen key={page} name={`settings/${page}`} options={pageOptions} />
              ))}
              {/* E-16, pushed from a card or from the route sheet, over it (M-03). */}
              <Stack.Screen name="creator/[id]" options={pageOptions} />
            </Stack>
            {/* E-10, over whichever screen asks for an account. */}
            <SignInSheet flow={signInFlow} />
          </BottomSheetModalProvider>
          {/* Toasts over everything, the modal sheets and the native modals included (M-06). */}
          <ToastHost />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
