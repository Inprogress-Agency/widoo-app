import { signInFlow } from '../src/auth/signIn';

/**
 * Links that reach the app from the system (expo-router). A sign-in link sent by e-mail (E-10)
 * is handed to the sign-in and leads nowhere: the app stays on the screen in use, the sheet over
 * it. Any other link goes to its route.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (signInFlow.openLink(path)) {
      return null;
    }
  } catch {
    // A link the sign-in cannot read goes to its route, as any other.
  }
  return path;
}
