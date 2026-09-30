'use client';

import { useLocale } from '@/lib/i18n/use-locale';
import { messages } from '@/messages';

/** Error while rendering a page, in the language of the address (layout to draw, #187). */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error } = messages[useLocale()];
  return (
    <main id="contenu" className="px-24 py-32">
      <h1 className="font-extrabold">{error.title}</h1>
      <p className="mt-12 text-muted">{error.body}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-24 rounded-pill bg-blue px-24 py-12 font-extrabold text-on-blue"
      >
        {error.retry}
      </button>
    </main>
  );
}
