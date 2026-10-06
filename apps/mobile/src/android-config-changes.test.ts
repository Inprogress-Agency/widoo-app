import type { AndroidConfig } from 'expo/config-plugins';
import { describe, expect, it } from 'vitest';
import appJson from '../app.json';
import {
  addConfigChanges,
  addConfigurationChangedHandler,
} from '../plugins/withAndroidConfigChanges';

/** The main activity of Expo's template (SDK 57), with the changes it already handles itself. */
const templateChanges =
  'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|assetsPaths';

/** The main activity of Expo's template, cut down to what the plugin reads. */
const templateActivity = `package app.widoo

import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

function manifestWith(configChanges?: string): AndroidConfig.Manifest.AndroidManifest {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      queries: [],
      application: [
        {
          $: { 'android:name': '.MainApplication' },
          activity: [
            {
              $: {
                'android:name': '.MainActivity',
                ...(configChanges === undefined ? {} : { 'android:configChanges': configChanges }),
              },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function configChangesOf(manifest: AndroidConfig.Manifest.AndroidManifest) {
  return manifest.manifest.application?.[0]?.activity?.[0]?.$['android:configChanges'];
}

// Android recreates the activity on a change of text or display size unless it declares it;
// the app follows both while open (#224).
describe('Android config changes', () => {
  it('adds the text and display size to the changes of the template', () => {
    expect(configChangesOf(addConfigChanges(manifestWith(templateChanges)))).toBe(
      `${templateChanges}|fontScale|density`,
    );
  });

  it('declares them on an activity that declares no change', () => {
    expect(configChangesOf(addConfigChanges(manifestWith()))).toBe('fontScale|density');
  });

  it('never writes a change twice', () => {
    const manifest = addConfigChanges(addConfigChanges(manifestWith('density|orientation')));
    expect(configChangesOf(manifest)).toBe('density|orientation|fontScale');
  });

  it('passes a new font scale on to JavaScript from the main activity', () => {
    const mainActivity = addConfigurationChangedHandler(templateActivity);
    expect(mainActivity).toContain('import android.content.res.Configuration');
    expect(mainActivity).toContain('import com.facebook.react.bridge.LifecycleEventListener');
    expect(mainActivity).toMatch(
      /override fun onConfigurationChanged\(newConfig: Configuration\) \{\s+super\.onConfigurationChanged\(newConfig\)/,
    );
    expect(mainActivity).toContain('getNativeModule("DeviceInfo") as? LifecycleEventListener');
    // Inside the class, after its last member.
    expect(mainActivity.trimEnd().endsWith('}\n}')).toBe(true);
    expect(mainActivity.indexOf('onConfigurationChanged')).toBeGreaterThan(
      mainActivity.indexOf('getMainComponentName'),
    );
  });

  it('writes the handler once over several prebuilds', () => {
    const once = addConfigurationChangedHandler(templateActivity);
    expect(addConfigurationChangedHandler(once)).toBe(once);
  });

  it('refuses an activity that handles configuration changes already', () => {
    const handled = templateActivity.replace(
      '  override fun getMainComponentName',
      '  override fun onConfigurationChanged(newConfig: Configuration) {}\n  override fun getMainComponentName',
    );
    expect(() => addConfigurationChangedHandler(handled)).toThrow(/by hand/);
  });

  it('is applied by the config of the app', () => {
    expect(appJson.expo.plugins).toContain('./plugins/withAndroidConfigChanges');
  });
});
