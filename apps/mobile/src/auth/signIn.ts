import { createMMKV } from 'react-native-mmkv';
import { analytics } from '../analytics';
import { api } from '../api/client';
import { showToast } from '../ui/toastStore';
import { i18next } from '../i18n';
import { createSignInFlow, type PendingEmail } from './flow';
import { authProvider, session } from '.';

/** The address a link was sent to, until it is opened: Firebase asks for it with the link. */
const storage = createMMKV({ id: 'auth' });
const PENDING_EMAIL_KEY = 'pendingEmail';

function readPendingEmail(): PendingEmail | null {
  const stored = storage.getString(PENDING_EMAIL_KEY);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as Partial<PendingEmail>;
    return typeof parsed.email === 'string'
      ? { email: parsed.email, intent: parsed.intent ?? null }
      : null;
  } catch {
    return null;
  }
}

/** The sign-in of E-10, from any action that asks for an account. */
export const signInFlow = createSignInFlow({
  provider: authProvider,
  isSignedIn: session.isSignedIn,
  getFirstName: async () => (await api.getMe()).firstName,
  saveFirstName: async (firstName) => {
    await api.updateMe({ firstName });
  },
  pendingEmail: {
    get: readPendingEmail,
    set: (value) => {
      if (value) {
        storage.set(PENDING_EMAIL_KEY, JSON.stringify(value));
      } else {
        storage.remove(PENDING_EMAIL_KEY);
      }
    },
  },
  trackPrompted: (intent) => analytics.track('auth_prompted', { intent }),
  trackCompleted: (result, intent) =>
    analytics.track('auth_completed', {
      provider: result.method,
      intent,
      is_new_user: result.isNewUser,
    }),
  onLinkResent: () => showToast('info', i18next.t('auth.sent.resent')),
});

// Signed out: the next account is asked for its name afresh.
session.store.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'anonymous') {
    signInFlow.reset();
  }
});
