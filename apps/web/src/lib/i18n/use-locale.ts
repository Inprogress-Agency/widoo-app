'use client';

import { defaultLocale, isSiteLocale, type SiteLocale } from '@/config/locales';
import { useParams } from 'next/navigation';

/**
 * Language of the page in a client component, for the screens Next.js renders without the route
 * props (missing page, error). Anywhere else, the language comes from the `[locale]` segment.
 */
export function useLocale(): SiteLocale {
  const { locale } = useParams<{ locale?: string }>();
  return locale && isSiteLocale(locale) ? locale : defaultLocale;
}
