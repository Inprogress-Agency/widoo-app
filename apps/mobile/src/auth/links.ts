import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

/**
 * Legal texts on the site, as proposed in Ecrans › E-21 until their native pages (E-19) and the
 * site's own paths (#242).
 */
export const TERMS_URL = 'https://widoo.app/conditions';
export const PRIVACY_URL = 'https://widoo.app/confidentialite';

/** `Intent.FLAG_ACTIVITY_NEW_TASK`: the mail app opens in its own task. */
const NEW_TASK = 0x10000000;

/** « Ouvrir ma messagerie »: the default mail app on its inbox, not on a new message. */
export async function openMailApp(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        category: 'android.intent.category.APP_EMAIL',
        flags: NEW_TASK,
      });
      return;
    }
    await Linking.openURL('message://');
  } catch {
    // No mail app: the user opens the link from wherever the mail is read.
  }
}

/** A plain address, enough to send a link to: Firebase refuses the rest. */
export const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
