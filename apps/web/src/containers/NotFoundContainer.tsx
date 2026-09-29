'use client';

import { useLocale } from '@/lib/i18n/use-locale';
import { messages } from '@/messages';
import Link from 'next/link';

/** Missing page, in the language of the address (layout to draw, #240). */
export function NotFoundContainer() {
  const locale = useLocale();
  const { meta, notFound } = messages[locale];
  return (
    <main id="contenu" className="px-24 py-32">
      <title>{meta.notFound.title}</title>
      <h1 className="font-extrabold">{notFound.title}</h1>
      <p className="mt-12 text-muted">{notFound.body}</p>
      <Link className="mt-24 inline-block text-blue-ink underline" href={`/${locale}`}>
        {notFound.home}
      </Link>
    </main>
  );
}
