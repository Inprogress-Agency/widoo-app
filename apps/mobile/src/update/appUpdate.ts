import { AppVersion, appUpdateOf, type AppUpdate } from '@widoo/shared';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import type { KeyValueStorage } from '../analytics/consent';
import { useAppConfig } from '../profile/me';

/**
 * What E-20 shows to this build (Ecrans › E-20, D-063): its version against the `minVersion` and
 * `recommendedVersion` of its platform in `GET /config`. Without an answer (no network at launch),
 * nothing: the app opens. A version the app cannot read never blocks it either.
 */
export function useAppUpdate(): { update: AppUpdate; recommendedVersion: string | null } {
  const { data } = useAppConfig();
  const current = Constants.expoConfig?.version;
  if (!data || !AppVersion.safeParse(current).success || current === undefined) {
    return { update: 'none', recommendedVersion: null };
  }
  const versions = data.appVersions[Platform.OS === 'android' ? 'android' : 'ios'];
  return {
    update: appUpdateOf(current, versions),
    recommendedVersion: versions.recommendedVersion,
  };
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.widoo';
/** The App Store page, once the app has one (`ios.appStoreUrl` of app.json); a search meanwhile. */
const APP_STORE_SEARCH_URL = 'https://apps.apple.com/search?term=Widoo';

/** « Mettre à jour »: the page of Widoo in the store of the phone. */
export function openStorePage(): void {
  const url =
    Platform.OS === 'android'
      ? PLAY_STORE_URL
      : (Constants.expoConfig?.ios?.appStoreUrl ?? APP_STORE_SEARCH_URL);
  void Linking.openURL(url);
}

const DISMISSED_KEY = 'update.recommended.dismissed';

/**
 * The recommended version already offered (« une fois par version », D-063): the sheet comes back
 * for a newer one only.
 */
export function createRecommendedMemory(storage: KeyValueStorage) {
  return {
    isOffered: (version: string) => storage.getString(DISMISSED_KEY) === version,
    setOffered: (version: string) => storage.set(DISMISSED_KEY, version),
  };
}

export const recommendedMemory = createRecommendedMemory(createMMKV({ id: 'update' }));
