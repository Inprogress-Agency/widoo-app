import { describe, expect, it } from 'vitest';
import { assertNever } from './assert-never';

describe('assertNever', () => {
  it('throws with the unexpected value', () => {
    expect(() => assertNever('unknown' as never)).toThrow('Unexpected value');
  });
});
