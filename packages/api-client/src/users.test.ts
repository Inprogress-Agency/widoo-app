import { describe, expect, it } from 'vitest';
import { usersQueryString } from './users';

describe('usersQueryString', () => {
  it('keeps the set values and encodes the search', () => {
    expect(usersQueryString({ q: 'Léa & co', cursor: 'abc' })).toBe('q=L%C3%A9a+%26+co&cursor=abc');
  });

  it('leaves out what is empty', () => {
    expect(usersQueryString({ q: '', cursor: undefined })).toBe('');
  });
});
