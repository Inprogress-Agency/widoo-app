import { describe, expect, it } from 'vitest';
import { photoOf } from './photos';
import { photoUrlsFrom } from './urls';

// Fictitious photos and credits only.
const upload = {
  storagePath: 'https://example.com/photos/etape.jpg',
  source: 'upload' as const,
  author: null,
  license: null,
  sourceUrl: null,
};
const base = 'https://storage.googleapis.com/widoo-test-media';
const withBucket = photoUrlsFrom(base);
const withoutBucket = photoUrlsFrom(undefined);

describe('photoOf', () => {
  it('serves a photo of its creator without credit', () => {
    expect(photoOf(upload, withBucket)).toEqual({ url: upload.storagePath, credit: null });
  });

  it('serves a free photo with its author, licence and source (D-052)', () => {
    const credit = { author: 'J. Moreau', license: 'CC0', sourceUrl: 'https://example.com/c' };
    expect(photoOf({ ...upload, source: 'commons', ...credit }, withBucket)).toEqual({
      url: upload.storagePath,
      credit,
    });
  });

  it('serves a stored photo at its full width under the public URL of the bucket', () => {
    expect(photoOf({ ...upload, storagePath: 'photos/0192f0c4' }, withBucket)).toEqual({
      url: `${base}/photos/0192f0c4/1600.jpg`,
      credit: null,
    });
  });

  it('leaves out a stored photo where no bucket serves it', () => {
    expect(photoOf({ ...upload, storagePath: 'photos/0192f0c4' }, withoutBucket)).toBeUndefined();
  });
});
