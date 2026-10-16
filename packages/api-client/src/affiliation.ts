import type { BookableStepsQuery } from '@widoo/shared';

/** Query string of the bookable steps, as the API reads it. */
export function bookableStepsQueryString(params: Partial<BookableStepsQuery>): string {
  const query = new URLSearchParams();
  for (const key of ['withoutPartnerLink', 'cursor'] as const) {
    const value = params[key];
    if (value !== undefined && value !== '') {
      query.set(key, value);
    }
  }
  return query.toString();
}
