import { describe, expect, it } from 'vitest';
import appJson from '../app.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

/** The options of a plugin of app.json, by its name. */
function pluginOptions(name: string): Record<string, unknown> {
  const plugins: unknown[] = appJson.expo.plugins;
  const entry = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name);
  return Array.isArray(entry) ? (entry[1] as Record<string, unknown>) : {};
}

describe('position request (Ecrans › E-18)', () => {
  it('says the text of E-18, in French by default and in each language of the phone', () => {
    const text =
      "Widoo s'en sert pour centrer la carte sur vous, trier les parcours par distance et vous " +
      "guider pendant une sortie. Elle n'est jamais enregistrée sur nos serveurs.";
    expect(pluginOptions('expo-location').locationWhenInUsePermission).toBe(text);
    expect(fr.ios.NSLocationWhenInUseUsageDescription).toBe(text);
    expect(en.ios.NSLocationWhenInUseUsageDescription).toMatch(/never stored on our servers/);
    expect(appJson.expo.locales).toEqual({ fr: './locales/fr.json', en: './locales/en.json' });
  });

  it('asks « when the app is in use » only', () => {
    const options = pluginOptions('expo-location');
    expect(options.locationAlwaysAndWhenInUsePermission).toBe(false);
    expect(options.locationAlwaysPermission).toBe(false);
  });
});
