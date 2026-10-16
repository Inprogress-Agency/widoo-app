import { describe, expect, it } from 'vitest';
import { bookableStepsQueryString } from './affiliation';

describe('bookableStepsQueryString', () => {
  it('keeps the filter and the page that are set', () => {
    expect(bookableStepsQueryString({ withoutPartnerLink: 'true', cursor: 'abc' })).toBe(
      'withoutPartnerLink=true&cursor=abc',
    );
  });

  it('leaves out what is empty', () => {
    expect(bookableStepsQueryString({ cursor: '' })).toBe('');
  });
});
