/**
 * Pages of an admin list. The cursor of a page is the number of rows before it, kept opaque for
 * the client: these lists are short and sorted by several columns, so an offset is enough, and a
 * row that leaves the list meanwhile only shifts the next page by one.
 */
const encode = (offset: number) => Buffer.from(String(offset)).toString('base64url');

/** Rows before the page a cursor names; 0 without a cursor, or for one that reads as nothing. */
export function offsetOfCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  const offset = Number(Buffer.from(cursor, 'base64url').toString());
  return Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
}

/** Cursors of the pages before and after the one that starts at `offset`; null at either end. */
export function neighbourCursors(
  offset: number,
  total: number,
  pageSize: number,
): { previousCursor: string | null; nextCursor: string | null } {
  return {
    previousCursor: offset > 0 ? encode(Math.max(0, offset - pageSize)) : null,
    nextCursor: offset + pageSize < total ? encode(offset + pageSize) : null,
  };
}
