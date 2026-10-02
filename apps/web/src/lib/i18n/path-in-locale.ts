import { legalDocOfPath, legalPaths } from '@/config/legal';
import type { SiteLocale } from '@/config/locales';

/**
 * The same address in another language: the first segment of the path changes, and a legal page
 * takes its path in that language (`/fr/conditions` → `/en/terms`, #242).
 */
export function pathInLocale(pathname: string, locale: SiteLocale): string {
  const rest = pathname.replace(/^\/(fr|en)(?=\/|$)/, '');
  const legal = legalDocOfPath(rest);
  if (legal) return `/${locale}${legalPaths[legal][locale]}`;
  return `/${locale}${rest === '/' ? '' : rest}`;
}
