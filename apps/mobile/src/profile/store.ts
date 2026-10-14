import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

/** The subscriptions page of the store the app came from: « Gérer » never cancels by itself. */
const subscriptionsUrl = () =>
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions?package=app.widoo';

export function openStoreSubscriptions(): void {
  void Linking.openURL(subscriptionsUrl());
}

/** Version and build of the app, as the stores number them: « 1.0 » and « 42 ». */
export function appVersion(): { version: string; build: string | null } {
  const config = Constants.expoConfig;
  const build = Platform.OS === 'ios' ? config?.ios?.buildNumber : config?.android?.versionCode;
  return { version: config?.version ?? '', build: build === undefined ? null : String(build) };
}
