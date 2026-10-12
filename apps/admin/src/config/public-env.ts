import { parseEnv } from './env';

/**
 * The environment as the browser sees it. Next.js replaces each `process.env.NEXT_PUBLIC_…`
 * written in full at build time, so the variables are named one by one, never read in a loop.
 */
export const publicEnv = parseEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL,
});
