import { getSessionClients } from '@/lib/auth/clients';
import type { AdminCounters } from '@widoo/shared';
import { useEffect, useState } from 'react';

// Light counters: read again every minute while the admin stays open, and when a screen says that
// what they count has just changed (a decision of the moderation).
const staleEvent = 'widoo:admin-counters-stale';

/** Tells the navigation that its counters changed: it reads them again at once. */
export function notifyCountersStale(): void {
  window.dispatchEvent(new Event(staleEvent));
}

const refreshMs = 60_000;

/**
 * The counters of the navigation, for the role of the member signed in. Empty until the API
 * answers, and when it refuses or fails: the navigation then shows no counter.
 */
export function useAdminCounters(isSignedIn: boolean): AdminCounters {
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
    window.addEventListener(staleEvent, read);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener(staleEvent, read);
    };
  }, [isSignedIn]);

  return isSignedIn ? counters : {};
}
