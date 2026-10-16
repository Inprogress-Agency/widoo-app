import { adminSignalsPageSize, type AdminRatings, type AdminRatingsQuery } from '@widoo/shared';
import { neighbourCursors, offsetOfCursor } from '../admin/page-cursor';

/**
 * The ratings with a comment (A-03). Ratings are not stored yet (`route_ratings`, ticket #64):
 * until the table exists, none was ever given, and the list is empty. The query is read all the
 * same, so that its filters are validated now.
 */
export async function readRatings(query: AdminRatingsQuery): Promise<AdminRatings> {
  const offset = offsetOfCursor(query.cursor);
  const total = 0;
  return {
    items: [],
    total,
    offset,
    ...neighbourCursors(offset, total, adminSignalsPageSize),
  };
}
