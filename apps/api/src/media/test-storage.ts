/**
 * The photo storage of the tests, in memory: no call to Google from a test (#47). `put` plays
 * the `PUT` of the app the way Cloud Storage checks it, against what the URL signed.
 */
import {
  metadataHeaders,
  UploadTooLarge,
  type PhotoStorage,
  type ReceivedUpload,
  type SignedUpload,
  type UploadToSign,
} from './storage';

const origin = 'https://storage.test';

export class MemoryPhotoStorage implements PhotoStorage {
  readonly uploads = new Map<string, ReceivedUpload>();
  readonly photos = new Map<string, Buffer>();
  readonly signed = new Map<string, UploadToSign & { headers: Record<string, string> }>();

  async signUpload(upload: UploadToSign): Promise<SignedUpload> {
    const headers = {
      'content-type': upload.contentType,
      'x-goog-content-length-range': `0,${upload.maxBytes}`,
      ...metadataHeaders(upload.metadata),
    };
    this.signed.set(upload.objectName, { ...upload, headers });
    return { url: `${origin}/uploads/${upload.objectName}?X-Goog-Signature=test`, headers };
  }

  /**
   * The `PUT` of an original on a signed URL: 403 for a URL never signed, expired, or sent with
   * other headers than signed (type, size range, metadata); 400 for a body outside the range.
   */
  put(
    url: string,
    headers: Record<string, string>,
    data: Buffer,
    now = new Date(),
  ): 200 | 400 | 403 {
    const objectName = new URL(url).pathname.replace(/^\/uploads\//, '');
    const upload = this.signed.get(objectName);
    if (!upload || now > upload.expiresAt) return 403;
    const sent = Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]);
    const expected = Object.entries(upload.headers);
    if (
      sent.length !== expected.length ||
      expected.some(([name, value]) => !sent.some(([key, got]) => key === name && got === value))
    ) {
      return 403;
    }
    if (data.length > upload.maxBytes) return 400;
    this.uploads.set(objectName, { data, metadata: upload.metadata });
    return 200;
  }

  async readUpload(objectName: string, maxBytes: number): Promise<ReceivedUpload | null> {
    const upload = this.uploads.get(objectName);
    if (upload && upload.data.length > maxBytes) throw new UploadTooLarge();
    return upload ?? null;
  }

  async deleteUpload(objectName: string): Promise<void> {
    this.uploads.delete(objectName);
  }

  async writePhoto(objectName: string, data: Buffer): Promise<void> {
    this.photos.set(objectName, data);
  }

  async deletePhotos(objectNames: readonly string[]): Promise<void> {
    for (const name of objectNames) this.photos.delete(name);
  }
}
