import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { uuidv7 } from './uuid';

describe('uuidv7', () => {
  it('is a version 7 RFC 9562 UUID', () => {
    const id = uuidv7();
    expect(z.uuid({ version: 'v7' }).safeParse(id).success).toBe(true);
    expect(uuidv7()).not.toBe(id);
  });

  it('starts with the creation time in milliseconds, so ids sort by creation', () => {
    const now = Date.UTC(2026, 8, 23, 10);
    const id = uuidv7(now);
    expect(Number.parseInt(id.replace('-', '').slice(0, 12), 16)).toBe(now);
    expect(uuidv7(now) < uuidv7(now + 1)).toBe(true);
  });
});
