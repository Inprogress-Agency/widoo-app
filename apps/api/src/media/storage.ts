/**
 * The photo storage (#47), behind a small interface: two buckets of Cloud Storage in the
 * environments (`gcs-storage.ts`), memory in the tests (`test-storage.ts`), which never call
 * Google. The originals land in a private bucket; the processed photos go to a public one.
 */

/** An original as the app sent it, read back from the upload bucket. */
export type ReceivedUpload = {
  data: Buffer;
  /** Custom metadata of the object, signed with the URL: `x-goog-meta-<key>` on the `PUT`. */
  metadata: Record<string, string>;
};

/** An upload to sign: one object, its type, its size at most, its metadata, its deadline. */
export type UploadToSign = {
  objectName: string;
  contentType: string;
  maxBytes: number;
  metadata: Record<string, string>;
  expiresAt: Date;
};

/** The URL of one `PUT` and the headers that `PUT` must send exactly. */
export type SignedUpload = { url: string; headers: Record<string, string> };

/** An original over the size allowed: the signed URL makes it impossible, it is refused anyway. */
export class UploadTooLarge extends Error {
  constructor() {
    super('The original sent exceeds the size allowed');
  }
}

export interface PhotoStorage {
  /**
   * A URL signed for one `PUT` of an original into the upload bucket, valid until `expiresAt`.
   * Its type, its size range and its metadata are part of the signature: storage refuses any
   * other value, as it refuses the request after the deadline.
   */
  signUpload(upload: UploadToSign): Promise<SignedUpload>;
  /** The original under `objectName`, or null when none is there; throws `UploadTooLarge`. */
  readUpload(objectName: string, maxBytes: number): Promise<ReceivedUpload | null>;
  /** Deletes an original; a missing one is no error. */
  deleteUpload(objectName: string): Promise<void>;
  /** Writes one processed JPEG into the public bucket: its name never changes its content. */
  writePhoto(objectName: string, data: Buffer): Promise<void>;
  /** Deletes processed photos; a missing one is no error. */
  deletePhotos(objectNames: readonly string[]): Promise<void>;
}

/** Headers of the custom metadata of an object, as Cloud Storage reads them on a `PUT`. */
export const metadataHeaders = (metadata: Record<string, string>) =>
  Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`x-goog-meta-${key}`, value]));
