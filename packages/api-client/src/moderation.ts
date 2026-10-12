import type { ModerationQueueQuery } from '@widoo/shared';

/**
 * What the admin asks of `GET /v1/admin/moderation`: filters, search, sort and page, all
 * optional. The sort and its direction default on the server.
 */
export type ModerationQueueParams = Partial<ModerationQueueQuery>;

/** Query string of the moderation queue, as the API reads it; what is not set is left out. */
export function moderationQueryString(params: ModerationQueueParams): string {
  const query = new URLSearchParams();
  for (const key of [
    'status',
    'city',
    'late',
    'revision',
    'q',
    'sort',
    'direction',
    'cursor',
  ] as const) {
    const value = params[key];
    if (value) {
      query.set(key, value);
    }
  }
  return query.toString();
}
