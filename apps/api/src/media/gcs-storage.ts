/**
 * The photo storage on Cloud Storage (#47). The API authenticates as its service account, without
 * a key: it signs the upload URLs through `signBlob` of the IAM Credentials API, on itself
 * (infra/gcp/5-media.sh grants it), the library choosing that way when it holds no private key.
 */
import { Storage } from '@google-cloud/storage';
import { metadataHeaders, type PhotoStorage, type UploadHead } from './storage';

/**
 * An hour in the caches, never more: Cloud Storage cannot expire a cached object, so a photo
 * deleted (Securite-et-RGPD, deletion on demand) may still be served by a cache for an hour.
 */
const photoCacheControl = 'public, max-age=3600';

const isNotFound = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 404;

/** Custom metadata as strings only: anything else from the object is dropped. */
const stringsOf = (metadata: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries(metadata ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );

export type GcsPhotoStorageOptions = {
  /** Private bucket of the originals. */
  uploads: string;
  /** Public bucket of the processed photos. */
  photos: string;
  /** Tests only: a client with fictitious credentials, to sign without any network. */
  storage?: Storage;
};

export function gcsPhotoStorage({
  uploads: uploadBucket,
  photos: photoBucket,
  storage = new Storage(),
}: GcsPhotoStorageOptions): PhotoStorage {
  const uploads = storage.bucket(uploadBucket);
  const photos = storage.bucket(photoBucket);
  return {
    async signUpload({ objectName, contentType, maxBytes, metadata, expiresAt }) {
      const extensionHeaders = {
        'x-goog-content-length-range': `0,${maxBytes}`,
        ...metadataHeaders(metadata),
      };
      const [url] = await uploads.file(objectName).getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: expiresAt,
        contentType,
        extensionHeaders,
      });
      return { url, headers: { 'content-type': contentType, ...extensionHeaders } };
    },

    async statUpload(objectName): Promise<UploadHead | null> {
      try {
        const [metadata] = await uploads.file(objectName).getMetadata();
        return { size: Number(metadata.size), metadata: stringsOf(metadata.metadata) };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async downloadUpload(objectName) {
      try {
        const [data] = await uploads.file(objectName).download();
        return data;
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async deleteUpload(objectName) {
      await uploads.file(objectName).delete({ ignoreNotFound: true });
    },

    async writePhoto(objectName, data) {
      await photos.file(objectName).save(data, {
        resumable: false,
        contentType: 'image/jpeg',
        metadata: { cacheControl: photoCacheControl },
      });
    },

    async deletePhotos(objectNames) {
      await Promise.all(
        objectNames.map((name) => photos.file(name).delete({ ignoreNotFound: true })),
      );
    },
  };
}
