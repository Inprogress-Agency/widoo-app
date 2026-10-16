import { describe, expect, it } from 'vitest';
import { photoOf } from './photos';

// Fictitious photos and credits only.
const upload = {
  storagePath: 'https://example.com/photos/etape.jpg',
  source: 'upload' as const,
  author: null,
  license: null,
  sourceUrl: null,
};

describe('photoOf', () => {
  it('serves a photo of its creator without credit', () => {
    expect(photoOf(upload)).toEqual({ url: upload.storagePath, credit: null });
  });

  it('serves a free photo with its author, licence and source (D-052)', () => {
    const credit = { author: 'J. Moreau', license: 'CC0', sourceUrl: 'https://example.com/c' };
    expect(photoOf({ ...upload, source: 'commons', ...credit })).toEqual({
      url: upload.storagePath,
      credit,
    });
  });

  it('leaves out a photo the storage does not serve yet', () => {
    expect(photoOf({ ...upload, storagePath: 'steps/0192f0c4/0.jpg' })).toBeUndefined();
  });
});
