/**
 * The photo storage of the tests, in memory: no call to Google from a test (#47). `put` plays
 * the `PUT` of the app the way Cloud Storage checks it, against what the URL signed.
 */
import {
  metadataHeaders,
  type PhotoStorage,
  type SignedUpload,
  type UploadHead,
  type UploadToSign,
} from './storage';

const origin = 'https://storage.test';

/** An original as the app sent it. */
export type StoredUpload = { data: Buffer; metadata: Record<string, string> };

export class MemoryPhotoStorage implements PhotoStorage {
  readonly uploads = new Map<string, StoredUpload>();
  readonly photos = new Map<string, Buffer>();
  readonly signed = new Map<string, UploadToSign & { headers: Record<string, string> }>();
  /** Originals read so far: a check that refuses must come before any. */
  downloads = 0;
  /** A test sets it to fail the writing of the widths it names. */
  failWrite: (objectName: string) => boolean = () => false;
  /** A test sets it to run something just before an original is read. */
  beforeDownload: () => Promise<void> = async () => {};
  /** A test sets it to make every read of an original hang, never answered. */
  stallDownloads = false;

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

  async statUpload(objectName: string): Promise<UploadHead | null> {
    const upload = this.uploads.get(objectName);
    return upload ? { size: upload.data.length, metadata: upload.metadata } : null;
  }

  async downloadUpload(objectName: string): Promise<Buffer | null> {
    this.downloads += 1;
    await this.beforeDownload();
    if (this.stallDownloads) return new Promise<never>(() => {});
    return this.uploads.get(objectName)?.data ?? null;
  }

  async deleteUpload(objectName: string): Promise<void> {
    this.uploads.delete(objectName);
  }

  async writePhoto(objectName: string, data: Buffer): Promise<void> {
    if (this.failWrite(objectName)) throw new Error(`Writing ${objectName} failed`);
    this.photos.set(objectName, data);
  }

  async deletePhotos(objectNames: readonly string[]): Promise<void> {
    for (const name of objectNames) this.photos.delete(name);
  }
}
