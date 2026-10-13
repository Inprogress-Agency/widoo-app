import { describe, expect, it } from 'vitest';
import { neighbourCursors, offsetOfCursor } from './page-cursor';

describe('page cursors', () => {
  it('has no neighbour for a list that fits in one page', () => {
    expect(neighbourCursors(0, 4, 50)).toEqual({ previousCursor: null, nextCursor: null });
  });

  it('names the next page, which names the previous one back', () => {
    const first = neighbourCursors(0, 120, 50);
    expect(offsetOfCursor(first.nextCursor ?? undefined)).toBe(50);
    const second = neighbourCursors(50, 120, 50);
    expect(offsetOfCursor(second.previousCursor ?? undefined)).toBe(0);
    expect(offsetOfCursor(second.nextCursor ?? undefined)).toBe(100);
    expect(neighbourCursors(100, 120, 50).nextCursor).toBeNull();
  });

  it.each([undefined, '', 'not-a-cursor', Buffer.from('-5').toString('base64url')])(
    'reads %s as the first page',
    (cursor) => {
      expect(offsetOfCursor(cursor)).toBe(0);
    },
  );
});
