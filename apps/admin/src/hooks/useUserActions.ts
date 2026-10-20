import { getSessionClients } from '@/lib/auth/clients';
import { downloadTextFile } from '@/lib/download';
import { isRecentSignInRequired } from '@/lib/recent-sign-in';
import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import {
  userConflictReasons,
  type CertifiedOverride,
  type GiftBody,
  type UserRole,
} from '@widoo/shared';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.users.toasts;

/** The toast of a 409: what is wrong when the API says it, a general sentence otherwise. */
function conflictTitleOf(reason: unknown): string {
  const known = userConflictReasons.find((candidate) => candidate === reason);
  return known ? texts.conflicts[known] : texts.conflict;
}

/** The toast of a failed action: a conflict, a refused role, a refused text, or any other. */
function failureTitleOf(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) return conflictTitleOf(error.body?.details?.reason);
    if (error.status === 403) return texts.forbidden;
    if (error.status === 400 || error.status === 422) return texts.invalid;
  }
  return texts.failed;
}

/**
 * The actions of the team on one account (A-06), each told in a toast. `onSettled` is called when
 * the action is done, and also after a conflict (another member got there first, or the account
 * no longer allows it): the screen then reads the account again. `onDeleted` replaces it for the
 * deletion, which leaves no card to read. A sign-in too old for a sensitive action is no failure to
 * tell in a toast: `isSignInRequired` says the person must sign in again, and `onSignInRequired`
 * closes the window of the action.
 */
export function useUserActions(
  userId: string,
  onSettled: () => void,
  onDeleted: () => void,
  onSignInRequired: () => void,
) {
  const [isBusy, setIsBusy] = useState(false);
  const [isSignInRequired, setIsSignInRequired] = useState(false);
  const { api } = getSessionClients();

  const send = async (action: () => Promise<unknown>, successTitle: string, done = onSettled) => {
    setIsBusy(true);
    try {
      await action();
      showToast('success', { title: successTitle });
      done();
    } catch (error) {
      if (isRecentSignInRequired(error)) {
        onSignInRequired();
        setIsSignInRequired(true);
        return;
      }
      showToast('error', { title: failureTitleOf(error) });
      if (error instanceof ApiRequestError && error.status === 409) {
        onSettled();
      }
    } finally {
      setIsBusy(false);
    }
  };

  return {
    isBusy,
    isSignInRequired,
    dismissSignInRequired: () => setIsSignInRequired(false),
    changeRole: (role: UserRole) =>
      send(() => api.changeUserRole(userId, { role }), texts.roleChanged),
    suspend: (reason: string) => send(() => api.suspendUser(userId, { reason }), texts.suspended),
    reactivate: (reason: string) =>
      send(() => api.reactivateUser(userId, { reason }), texts.reactivated),
    gift: (gift: GiftBody) =>
      send(() => api.giftUser(userId, gift), gift.until ? texts.giftedPlan : texts.giftedRoute),
    setCertification: (override: CertifiedOverride) =>
      send(() => api.setUserCertification(userId, { override }), texts.certification),
    exportData: () =>
      send(async () => {
        const data = await api.exportUserData(userId);
        downloadTextFile(
          `widoo-donnees-${userId}.json`,
          JSON.stringify(data, null, 2),
          'application/json',
        );
      }, texts.exported),
    remove: () => send(() => api.deleteUser(userId), texts.deleted, onDeleted),
  };
}
