import { describe, expect, it } from 'vitest';
import { cardCoverWidth, fullPhotoWidth, photoUrlsFrom } from './urls';

const base = 'https://storage.googleapis.com/widoo-test-media';
const photoUrls = photoUrlsFrom(base);

describe('photoUrlsFrom', () => {
  it('serves a stored photo under the public URL of the bucket, at the width asked', () => {
    const path = 'photos/0192f0c4-6b1e-7c3a-9d2e-5f8a1b2c3d4e';
    expect(photoUrls(path, cardCoverWidth)).toBe(`${base}/${path}/800.jpg`);
    expect(photoUrls(path, fullPhotoWidth)).toBe(`${base}/${path}/1600.jpg`);
    expect(photoUrls(path, 400)).toBe(`${base}/${path}/400.jpg`);
  });

  it('serves an external photo by its https URL, whatever the width', () => {
    const url = 'https://images.example.com/photo.jpg?w=1200&h=800';
    expect(photoUrls(url, 400)).toBe(url);
    expect(photoUrls(url, fullPhotoWidth)).toBe(url);
  });

  it('serves no stored photo without a public URL', () => {
    expect(photoUrlsFrom(undefined)('photos/0192f0c4', fullPhotoWidth)).toBeNull();
    expect(photoUrlsFrom(undefined)('https://images.example.com/a.jpg', 800)).toBe(
      'https://images.example.com/a.jpg',
    );
  });

  it.each([
    ['a plain http URL', 'http://images.example.com/a.jpg'],
    ['another scheme', 'gs://widoo-test-media/photos/a'],
    ['a parent segment', 'photos/../secrets'],
    ['a leading slash', '/photos/a'],
    ['a file name', 'test/step/0192f0c4.jpg'],
    ['a query', 'photos/a?x=1'],
    ['an empty path', ''],
  ])('makes no URL of %s', (_, path) => {
    expect(photoUrls(path, fullPhotoWidth)).toBeNull();
  });
});
