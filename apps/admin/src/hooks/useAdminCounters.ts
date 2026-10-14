import { getSessionClients } from '@/lib/auth/clients';
import type { AdminCounters } from '@widoo/shared';
import { useEffect, useState } from 'react';

// Light counters: read again every minute while the admin stays open, and at each change of page
// (a decision ends with the next page, so the menu follows at once).
const refreshMs = 60_000;

/**
 * The counters of the navigation, for the role of the member signed in. Empty until the API
 * answers, and when it refuses or fails: the navigation then shows no counter.
 */
export function useAdminCounters(isSignedIn: boolean, pathname: string): AdminCounters {
  const [counters, setCounters] = useState<AdminCounters>({});

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    const controller = new AbortController();
    const read = () =>
      getSessionClients()
        .api.getAdminCounters(controller.signal)
        .then(setCounters)
        .catch(() => undefined);
    void read();
    const timer = window.setInterval(read, refreshMs);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [isSignedIn, pathname]);

  return isSignedIn ? counters : {};
}
