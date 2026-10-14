import type { QueryClient } from '@tanstack/react-query';
import { isAccountDeleted } from '@widoo/api-client';

/** Every answer about routes: search, lists, counts, sheets and timelines. */
const routesQueryKey = ['routes'] as const;

/**
 * The answers kept for the previous caller go when the rights change, at sign-in and sign-out
 * (D-075): a Premium card unlocked for an account is never shown signed out, nor a locked one
 * after the sign-in. The queries on screen ask the API again, with or without token; the search
 * kept on the device is rewritten from the new answer.
 */
export function resetRightsDependentQueries(client: QueryClient): Promise<void> {
  return client.resetQueries({ queryKey: routesQueryKey });
}

/**
 * Signs out when the API says the account was deleted (401 « Account deleted »): its token is
 * refused for good, refreshing it would not help.
 */
export function signOutOnDeletedAccount(client: QueryClient, signOut: () => Promise<void>) {
  return client.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'error' &&
      isAccountDeleted(event.action.error)
    ) {
      void signOut();
    }
  });
}
