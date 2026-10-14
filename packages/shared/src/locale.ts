/** Languages of the app and of the texts the server sends: French and English at the MVP (D-062). */
export const appLocales = ['fr', 'en'] as const;
/** Same as the `AppLocale` schema of `schemas/me`, which validates it on the wire. */
type AppLocale = (typeof appLocales)[number];

/** Language of an account that never chose one and never registered a phone. */
export const defaultAppLocale: AppLocale = 'fr';

/**
 * Language of the push notifications and e-mails of an account (D-062): the language chosen in
 * Réglages › Langue (`users.locale`), else the language of the phone it registered last, else
 * French. Null for the account means « Langue du téléphone ».
 */
export function effectiveLocale(
  accountLocale: AppLocale | null,
  lastDeviceLocale: AppLocale | null,
): AppLocale {
  return accountLocale ?? lastDeviceLocale ?? defaultAppLocale;
}
