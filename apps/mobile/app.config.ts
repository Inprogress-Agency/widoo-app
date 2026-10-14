import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Folder of the Firebase files on a developer's machine, ignored by git (README › App mobile ›
 * Connexion). A build EAS gets them from the file variables of its environment instead.
 */
export const LOCAL_FIREBASE_DIR = 'firebase';

const ANDROID_FILE = 'google-services.json';
const IOS_FILE = 'GoogleService-Info.plist';

export interface FirebaseFiles {
  /** Path of `google-services.json`, null when it is nowhere. */
  android: string | null;
  /** Path of `GoogleService-Info.plist`, null when it is nowhere. */
  ios: string | null;
  /** Firebase project read from `google-services.json` (`widoo-staging`), null without it. */
  projectId: string | null;
}

interface FirebaseFileSources {
  /** `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST`: EAS file variables are paths. */
  env: Record<string, string | undefined>;
  /** Folder of the app, where the local folder lives. */
  projectRoot: string;
  exists?: (file: string) => boolean;
  read?: (file: string) => string;
}

/** `project_info.project_id` of a `google-services.json`, null when it does not read. */
export function projectIdOf(json: string): string | null {
  try {
    const parsed: unknown = JSON.parse(json);
    const id = (parsed as { project_info?: { project_id?: unknown } }).project_info?.project_id;
    return typeof id === 'string' && /^[a-z0-9-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * The Firebase files of the build: the EAS file variable when it is set, else the local folder.
 * They are public (keys restricted to the bundle id `app.widoo`), but stay out of git so that
 * each environment brings its own project.
 */
export function firebaseFiles({
  env,
  projectRoot,
  exists = existsSync,
  read = (file) => readFileSync(file, 'utf8'),
}: FirebaseFileSources): FirebaseFiles {
  const find = (variable: string, name: string) => {
    const file = env[variable] ?? path.join(projectRoot, LOCAL_FIREBASE_DIR, name);
    return exists(file) ? file : null;
  };
  const android = find('GOOGLE_SERVICES_JSON', ANDROID_FILE);
  const ios = find('GOOGLE_SERVICE_INFO_PLIST', IOS_FILE);
  return { android, ios, projectId: android ? projectIdOf(read(android)) : null };
}

/**
 * Hosts whose links open the app: the Firebase domain that sends the sign-in links by e-mail
 * (Ecrans › E-10, lien magique). Authorized by default in Firebase Authentication.
 */
export function emailLinkHost(projectId: string): string {
  return `${projectId}.firebaseapp.com`;
}

/** Path of the e-mail sign-in links on the Firebase domain. */
export const EMAIL_LINK_PATH = '/__/auth/links';

/**
 * app.json, plus what depends on the environment: the Firebase files of Auth (E-10), read from
 * the EAS file variables or from `apps/mobile/firebase/` (README › App mobile › Connexion), and
 * the links of the Firebase domain that open the app.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const files = firebaseFiles({ env: process.env, projectRoot: __dirname });
  // A build on EAS without its files would start, then crash at the first Firebase call.
  if (process.env.EAS_BUILD === 'true' && (!files.android || !files.ios)) {
    throw new Error(
      'GOOGLE_SERVICES_JSON and GOOGLE_SERVICE_INFO_PLIST must be set in the EAS environment',
    );
  }
  const linkHost = files.projectId ? emailLinkHost(files.projectId) : null;
  const base = config as ExpoConfig;

  return {
    ...base,
    ios: {
      ...base.ios,
      ...(files.ios && { googleServicesFile: files.ios }),
      ...(linkHost && { associatedDomains: [`applinks:${linkHost}`] }),
    },
    android: {
      ...base.android,
      ...(files.android && { googleServicesFile: files.android }),
      ...(linkHost && {
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host: linkHost, pathPrefix: EMAIL_LINK_PATH }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      }),
    },
    plugins: [
      ...(base.plugins ?? []),
      // Firebase through CocoaPods rather than Swift Package Manager, which needs dynamic
      // frameworks for every pod: linked statically, the other pods stay as they are.
      ['@react-native-firebase/app', { ios: { disableSPM: true } }],
      '@react-native-firebase/auth',
      // Without options, it reads the client ids from the Firebase files.
      '@react-native-google-signin/google-signin',
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'static', forceStaticLinking: ['RNFBApp', 'RNFBAuth'] },
        },
      ],
    ],
  };
};
