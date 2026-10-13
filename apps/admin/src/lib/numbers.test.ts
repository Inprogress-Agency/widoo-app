import { describe, expect, it } from 'vitest';
import { formatCount } from './numbers';

describe('formatCount', () => {
  it('groups the thousands as French does', () => {
    // Narrow no-break space (U+202F) between the groups.
    expect(formatCount(2140)).toBe('2\u202f140');
    expect(formatCount(86)).toBe('86');
  });
});
