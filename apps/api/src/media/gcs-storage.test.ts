import { Storage } from '@google-cloud/storage';
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gcsPhotoStorage } from './gcs-storage';

// A key made for this test, of a fictitious account: the library signs locally, without network.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const storage = new Storage({
  projectId: 'widoo-test',
  credentials: {
    client_email: 'widoo-api-run@widoo-test.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  },
});
const photos = gcsPhotoStorage({
  uploads: 'widoo-test-media-uploads',
  photos: 'widoo-test-media',
  storage,
});

describe('gcsPhotoStorage.signUpload', () => {
  it('signs one PUT of the original, its type, size range and owner in the signature', async () => {
    const now = Date.now();
    const { url, headers } = await photos.signUpload({
      objectName: 'uploads/0192f0c4/0192f0c5',
      contentType: 'image/jpeg',
      maxBytes: 10 * 1024 * 1024,
      metadata: { 'owner-type': 'step', 'owner-id': '0192f0c6' },
      expiresAt: new Date(now + 15 * 60 * 1000),
    });

    const signed = new URL(url);
    expect(signed.origin + signed.pathname).toBe(
      'https://storage.googleapis.com/widoo-test-media-uploads/uploads/0192f0c4/0192f0c5',
    );
    expect(signed.searchParams.get('X-Goog-Algorithm')).toBe('GOOG4-RSA-SHA256');
    expect(Number(signed.searchParams.get('X-Goog-Expires'))).toBeLessThanOrEqual(15 * 60);
    expect(signed.searchParams.get('X-Goog-SignedHeaders')?.split(';')).toEqual([
      'content-type',
      'host',
      'x-goog-content-length-range',
      'x-goog-meta-owner-id',
      'x-goog-meta-owner-type',
    ]);
    expect(headers).toEqual({
      'content-type': 'image/jpeg',
      'x-goog-content-length-range': '0,10485760',
      'x-goog-meta-owner-type': 'step',
      'x-goog-meta-owner-id': '0192f0c6',
    });
  });
});
