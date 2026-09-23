/**
 * Error reports (Sentry) keep what helps fix a crash and drop what identifies a person or opens
 * an account (wiki Securite-et-RGPD): credentials, e-mail addresses, cookies, request bodies and
 * query strings (a search area, a share token). Shared by the app and the API, whatever the SDK.
 */

/** Never reported, lowercase. */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]);

const SECRETS: [RegExp, string][] = [
  [/\bBearer\s+[\w\-.~+/]+=*/gi, 'Bearer [redacted]'],
  // A JWT, such as a Firebase ID token, even without its `Bearer` prefix.
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, '[jwt]'],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
];

/** Masks tokens and e-mail addresses in a free text (an error message, a breadcrumb). */
export function redactText(text: string): string {
  return SECRETS.reduce((result, [pattern, mask]) => result.replace(pattern, mask), text);
}

const withoutQuery = (url: string) => url.split(/[?#]/)[0] ?? '';

/** The parts of a Sentry breadcrumb read here. */
export interface ReportBreadcrumb {
  category?: string;
  message?: string;
  data?: { [key: string]: unknown };
}

/** The parts of a Sentry event read here. */
export interface ReportEvent {
  user?: { id?: string | number; [key: string]: unknown };
  message?: string;
  request?: { url?: string; method?: string; headers?: { [key: string]: string } };
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: ReportBreadcrumb[];
}

/**
 * `beforeBreadcrumb`: console output is dropped, as it is not reviewed for personal data; HTTP
 * breadcrumbs lose their query string and fragment.
 */
export function scrubBreadcrumb<T extends ReportBreadcrumb>(breadcrumb: T): T | null {
  if (breadcrumb.category === 'console') {
    return null;
  }
  if (breadcrumb.message) {
    breadcrumb.message = redactText(breadcrumb.message);
  }
  if (breadcrumb.data) {
    if (typeof breadcrumb.data.url === 'string') {
      breadcrumb.data.url = withoutQuery(breadcrumb.data.url);
    }
    // Where Sentry's HTTP breadcrumbs keep what `withoutQuery` removes from the URL.
    delete breadcrumb.data['http.query'];
    delete breadcrumb.data['http.fragment'];
  }
  return breadcrumb;
}

/**
 * `beforeSend`, in place. The user is reduced to its opaque id (the API's `users.id`) when
 * `keepUserId`, removed otherwise; the request to its method, path and harmless headers.
 */
export function scrubEvent(event: ReportEvent, { keepUserId }: { keepUserId: boolean }): void {
  const userId = event.user?.id;
  event.user = keepUserId && userId !== undefined ? { id: userId } : undefined;
  if (event.message) {
    event.message = redactText(event.message);
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = redactText(exception.value);
    }
  }
  if (event.request) {
    const { url, method, headers = {} } = event.request;
    event.request = {
      ...(url && { url: withoutQuery(url) }),
      ...(method && { method }),
      headers: Object.fromEntries(
        Object.entries(headers).filter(([name]) => !SENSITIVE_HEADERS.has(name.toLowerCase())),
      ),
    };
  }
  event.breadcrumbs = event.breadcrumbs?.flatMap((breadcrumb) => scrubBreadcrumb(breadcrumb) ?? []);
}
