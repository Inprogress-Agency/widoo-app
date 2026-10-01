'use client';

import { detectPlatform, storeLinkFor, type StoreLinks } from '@/lib/store-links';
import type { MouseEvent } from 'react';

type Props = {
  label: string;
  /** `widoo://route/<id>`: opens the route when the app is installed. */
  appLink: string;
  stores: StoreLinks;
  routeId: string;
  source?: string;
};

/** Time left to the app to open before the store takes over. */
const storeDelayMs = 1500;

/**
 * « Ouvrir dans l'app » (E-21): tries the app, then leads to the store of the phone. A button
 * rather than the universal link alone, because the in-app browsers of messaging apps do not open
 * universal links.
 */
export function OpenInAppButton({ label, appLink, stores, routeId, source }: Props) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
    const store = storeLinkFor(platform, stores, { routeId, source });
    if (!store) return;

    event.preventDefault();
    // The app opened: the page is hidden, the store must not follow.
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = store;
    }, storeDelayMs);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') window.clearTimeout(timer);
      },
      { once: true },
    );
    window.location.href = appLink;
  }

  return (
    <a
      href={appLink}
      onClick={open}
      className="block rounded-pill bg-bg px-32 py-16 text-center text-button-l text-blue-ink"
    >
      {label}
    </a>
  );
}
