'use client';

import type { MouseEvent } from 'react';

/**
 * « Aller au contenu » (E-21, D-070): the first stop of the keyboard, hidden until it has the
 * focus, then shown beside the logo. Moves the focus to the `<main id="contenu">` of the page,
 * without adding an entry to the history (a plain `#contenu` link did, and « Précédent » from
 * another page then changed the address only). Without JavaScript, the link still leads there.
 */
export function SkipLink({ label }: { label: string }) {
  function skip(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById('contenu');
    if (!main) return;
    event.preventDefault();
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus();
  }
  return (
    <a
      href="#contenu"
      onClick={skip}
      // `not-sr-only` also clears the padding: given back on focus.
      className="sr-only rounded-pill bg-ink text-button text-on-blue focus:not-sr-only focus:px-24 focus:py-12"
    >
      {label}
    </a>
  );
}
