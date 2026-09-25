import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, type SortKeyType } from './cursor';

const types: SortKeyType[] = ['int', 'bigint', 'float8', 'uuid'];
const keys = [3, '1790000000123456', 612.4817, '01997a4e-8c00-7000-8000-000000000100'];

describe('search cursor', () => {
  it('gives back the sort key values it was built from', () => {
    expect(decodeCursor(encodeCursor('recommended', keys), 'recommended', types)).toEqual(keys);
  });

  it('is opaque and URL safe', () => {
    expect(encodeCursor('recommended', keys)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  const forge = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

  it.each([
    ['garbage', '%%%'],
    ['non JSON', Buffer.from('not json').toString('base64url')],
    ['another sort', encodeCursor('rating', keys)],
    ['a missing key', forge({ sort: 'recommended', keys: keys.slice(1) })],
    [
      'a string where a number is due',
      forge({ sort: 'recommended', keys: ['3', ...keys.slice(1)] }),
    ],
    [
      'SQL in a bigint',
      forge({ sort: 'recommended', keys: [3, '1; drop table routes', 1, keys[3]] }),
    ],
    ['a malformed uuid', forge({ sort: 'recommended', keys: [...keys.slice(0, 3), "x' or 1=1"] })],
    ['an extra field', forge({ sort: 'recommended', keys, admin: true })],
  ])('refuses %s with 400', (_, cursor) => {
    expect(() => decodeCursor(cursor, 'recommended', types)).toThrow(
      expect.objectContaining({ statusCode: 400, message: 'Invalid cursor' }),
    );
  });
});
