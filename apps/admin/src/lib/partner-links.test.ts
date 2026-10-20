import { describe, expect, it } from 'vitest';
import { partnerAppUrl, partnerPageUrl } from './partner-links';

describe('the links of a partner', () => {
  it('writes the page, and the link of the stores with its source of measure', () => {
    expect(partnerPageUrl('https://widooapp.com', 'hotel-du-nord')).toBe(
      'https://widooapp.com/p/hotel-du-nord',
    );
    expect(partnerAppUrl('https://widooapp.com', 'hotel-du-nord')).toBe(
      'https://widooapp.com/app?src=b2b-hotel-du-nord',
    );
  });
});
