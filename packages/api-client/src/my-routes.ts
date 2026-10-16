/** Query of `GET /me/routes`: the caller's routes by pages, the newest first. */
export interface MyRoutesParams {
  cursor?: string;
  limit?: number;
}

export function myRoutesQueryString({ cursor, limit }: MyRoutesParams): string {
  const query = new URLSearchParams();
  if (cursor) {
    query.set('cursor', cursor);
  }
  if (limit !== undefined) {
    query.set('limit', String(limit));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}
