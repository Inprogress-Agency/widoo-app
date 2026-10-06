import {
  AndroidConfig,
  withAndroidManifest,
  withMainActivity,
  type ConfigPlugin,
} from 'expo/config-plugins';

type AndroidManifest = AndroidConfig.Manifest.AndroidManifest;

/**
 * Settings of the system the app follows while it is open, rather than having Android destroy
 * and recreate its activity: the text size (`fontScale`) and the display size (`density`).
 * A recreated activity mounts the whole React tree again, so the map loses its camera and the
 * tooltip of a selected route its anchor (#224); the app already lays its text out again when
 * the text size changes (#150), as it does on iOS.
 */
export const followedConfigChanges = ['fontScale', 'density'] as const;

/** `android:configChanges` of the main activity with `followedConfigChanges`, each once. */
export function addConfigChanges(manifest: AndroidManifest): AndroidManifest {
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  const current = activity.$['android:configChanges']?.split('|').filter(Boolean) ?? [];
  const added = followedConfigChanges.filter((change) => !current.includes(change));
  activity.$['android:configChanges'] = [...current, ...added].join('|');
  return manifest;
}

/** Marks the code this plugin writes into `MainActivity`, so a new prebuild never doubles it. */
const marker = 'Widoo, issue 224';

const onConfigurationChanged = `
  /**
   * ${marker}: the activity follows a new text size without being recreated, and React Native
   * lays the native views out again, but it only reads the font scale it gives JavaScript when
   * the app comes back to the foreground: a text size changed while the app stays in front (split
   * screen, quick settings) would keep every text measured at the former size. It is read now, as
   * on a return to the foreground, and JavaScript hears of it through \`Dimensions\`.
   */
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    (reactHost?.currentReactContext?.getNativeModule("DeviceInfo") as? LifecycleEventListener)
        ?.onHostResume()
  }
`;

/** `MainActivity.kt` with `onConfigurationChanged` passing the new font scale on to JavaScript. */
export function addConfigurationChangedHandler(mainActivity: string): string {
  if (mainActivity.includes(marker)) {
    return mainActivity;
  }
  if (mainActivity.includes('fun onConfigurationChanged')) {
    throw new Error('MainActivity already handles configuration changes: merge issue 224 by hand');
  }
  const withImports = AndroidConfig.CodeMod.addImports(
    mainActivity,
    ['android.content.res.Configuration', 'com.facebook.react.bridge.LifecycleEventListener'],
    false,
  );
  return AndroidConfig.CodeMod.appendContentsInsideDeclarationBlock(
    withImports,
    'class MainActivity',
    onConfigurationChanged,
  );
}

/** Writes `followedConfigChanges` and their handling into the Android project of prebuild. */
const withAndroidConfigChanges: ConfigPlugin = (config) =>
  withMainActivity(
    withAndroidManifest(config, (manifestConfig) => {
      manifestConfig.modResults = addConfigChanges(manifestConfig.modResults);
      return manifestConfig;
    }),
    (activityConfig) => {
      if (activityConfig.modResults.language !== 'kt') {
        throw new Error('MainActivity is expected in Kotlin, as Expo generates it');
      }
      activityConfig.modResults.contents = addConfigurationChangedHandler(
        activityConfig.modResults.contents,
      );
      return activityConfig;
    },
  );

export default withAndroidConfigChanges;
