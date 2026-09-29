import 'server-only';
import { isSiteLocale, type SiteLocale } from '@/config/locales';
import { messages, type Messages } from '@/messages';
import { notFound } from 'next/navigation';

/** Texts of a language, on the server only: they never ship in the JavaScript of the page. */
export function getMessages(locale: SiteLocale): Messages {
  return messages[locale];
}

/** Reads the `[locale]` segment of a route; an unknown language is a missing page. */
export function readLocale(value: string): SiteLocale {
  if (!isSiteLocale(value)) notFound();
  return value;
}
