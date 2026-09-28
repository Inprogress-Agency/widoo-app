import { firstLaunch } from '@widoo/tokens';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { createSplashGate } from './splash-gate';

let gate: ReturnType<typeof createSplashGate> | undefined;

/**
 * Keeps the launch screen from the start of the app until the home is ready, `maxMs` at most,
 * then fades it out (E-18, D-060; the fade is iOS only, Android hides it at once).
 */
export function holdSplash(): void {
  void SplashScreen.preventAutoHideAsync();
  SplashScreen.setOptions({ duration: firstLaunch.splash.fadeOutMs, fade: true });
  gate = createSplashGate(() => void SplashScreen.hideAsync(), firstLaunch.splash.maxMs);
}

/** Lets the launch screen go once the home shows its content: the map, when it is ready (#26). */
export function useReleaseSplash(isReady: boolean): void {
  useEffect(() => {
    if (isReady) {
      gate?.release();
    }
  }, [isReady]);
}
