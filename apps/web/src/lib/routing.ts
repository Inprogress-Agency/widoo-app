import { legalDocOfPath, legalPaths } from '@/config/legal';
import { isSiteLocale } from '@/config/locales';
import { negotiateLocale } from './i18n/negotiate';

export type RoutingInput = {
  /** Host header of the request, port included when there is one. */
  host: string | null;
  pathname: string;
  search: string;
  acceptLanguage: string | null;
  siteUrl: string;
  aliasHosts: readonly string[];
};

export type RoutingDecision =
  | { kind: 'next' }
  | { kind: 'redirect'; location: string; status: 307 | 308; negotiated: boolean }
  | { kind: 'rewrite'; pathname: string };

/**
 * What the proxy does with a request (Site-Web › Référencement, Langues):
 * - a request on an alias host (`www`, former domain) moves to the canonical site, 308;
 * - `/` sends to the language of the browser, 307, never cached; so do the short addresses of the
 *   legal pages cited by the stores (`/conditions`, `/confidentialite`, `/terms`, `/privacy`, #242),
 *   each to its path in that language;
 * - a path with a language prefix is served as is;
 * - any other path is served in the language of the browser, without changing the address, so
 *   that an unknown address shows the missing page in the right language.
 */
export function decideRouting(input: RoutingInput): RoutingDecision {
  const host = input.host?.toLowerCase().replace(/:\d+$/, '') ?? '';
  if (input.aliasHosts.includes(host)) {
    return {
      kind: 'redirect',
      location: `${input.siteUrl}${input.pathname}${input.search}`,
      status: 308,
      negotiated: false,
    };
  }

  const [, first = ''] = input.pathname.split('/');
  if (isSiteLocale(first)) return { kind: 'next' };

  const locale = negotiateLocale(input.acceptLanguage);
  if (input.pathname === '/') {
    return {
      kind: 'redirect',
      location: `/${locale}${input.search}`,
      status: 307,
      negotiated: true,
    };
  }
  const legal = legalDocOfPath(input.pathname);
  if (legal) {
    return {
      kind: 'redirect',
      location: `/${locale}${legalPaths[legal][locale]}${input.search}`,
      status: 307,
      negotiated: true,
    };
  }
  return { kind: 'rewrite', pathname: `/${locale}${input.pathname}` };
}
