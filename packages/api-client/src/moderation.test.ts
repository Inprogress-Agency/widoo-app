import { describe, expect, it } from 'vitest';
import { moderationQueryString } from './moderation';

describe('moderationQueryString', () => {
  it('is empty for the default queue', () => {
    expect(moderationQueryString({})).toBe('');
  });

  it('writes the filters, the search, the sort and the page', () => {
    expect(
      moderationQueryString({
        status: 'pending',
        late: 'true',
        q: 'montmartre',
        sort: 'title',
        direction: 'desc',
        cursor: 'NTA',
      }),
    ).toBe('status=pending&late=true&q=montmartre&sort=title&direction=desc&cursor=NTA');
  });

  it('encodes what the person typed', () => {
    expect(moderationQueryString({ q: 'café & thé' })).toBe('q=caf%C3%A9+%26+th%C3%A9');
  });
});
