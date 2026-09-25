import { describe, expect, it } from 'vitest';
import { etagOf, matchesIfNoneMatch } from './http-cache';

describe('ETag', () => {
  const etag = etagOf('{"items":[]}');

  it('is a strong tag that changes with the body', () => {
    expect(etag).toMatch(/^"[\w-]{27}"$/);
    expect(etagOf('{"items":[1]}')).not.toBe(etag);
  });

  it.each([
    [etag, true],
    [`W/${etag}`, true],
    [`"other", ${etag}`, true],
    ['*', true],
    ['"other"', false],
    [undefined, false],
  ])('If-None-Match %s matches: %s', (header, expected) => {
    expect(matchesIfNoneMatch(header, etag)).toBe(expected);
  });
});
