import { ApiError, PhotoUploadRequest, PhotoUploadTicket, StoredPhoto } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { mediaUnavailable } from '../errors';
import { confirmUpload } from '../media/confirm';
import type { PhotoStorage } from '../media/storage';
import { issueUpload } from '../media/upload';
import { currentUser } from './me';

/**
 * Signed URLs asked per minute and per client IP: a creator adds photos one by one, the quota of
 * the day (50) bounds the photos kept, this bounds the URLs asked without sending anything.
 */
export const UPLOAD_URL_RATE_LIMIT = 30;

const security = [{ firebaseIdToken: [] }];
const tags = ['creation'];
const MediaParams = z.strictObject({ id: z.uuid() });
const errors = { 403: ApiError, 404: ApiError, 409: ApiError, 503: ApiError };

export type MediaRoutesOptions = {
  /** Null: no photo storage in this environment, every photo route answers 503. */
  storage: PhotoStorage | null;
};

/**
 * The photos of the creators (#47, wiki API › Création): a signed URL to send the original, then
 * its confirmation. Signed in, never cached.
 */
export const mediaRoutes: FastifyPluginAsyncZod<MediaRoutesOptions> = async (app, { storage }) => {
  app.addHook('onRequest', app.requireAuth);
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });
  const storageOrUnavailable = (): PhotoStorage => {
    if (!storage) throw mediaUnavailable();
    return storage;
  };
  // Before the body is validated: without storage, nothing else is worth saying.
  app.addHook('preValidation', async () => {
    storageOrUnavailable();
  });

  app.post(
    '/media/upload-url',
    {
      config: { rateLimit: { max: UPLOAD_URL_RATE_LIMIT, timeWindow: '1 minute' } },
      schema: {
        tags,
        summary: 'A signed URL to send one photo of a route, a step or a place',
        security,
        body: PhotoUploadRequest,
        response: { 200: PhotoUploadTicket, 429: ApiError, ...errors },
      },
    },
    async (request) =>
      issueUpload(app.db, storageOrUnavailable(), currentUser(request), request.body, new Date()),
  );

  app.post(
    '/media/:id/confirm',
    {
      schema: {
        tags,
        summary: 'Confirm a photo sent: stored in three widths without metadata',
        security,
        params: MediaParams,
        response: { 200: StoredPhoto, 201: StoredPhoto, 422: ApiError, 429: ApiError, ...errors },
      },
    },
    async (request, reply) => {
      const { photo, created } = await confirmUpload(
        app.db,
        storageOrUnavailable(),
        app.photoUrls,
        currentUser(request),
        request.params.id,
        { now: new Date(), log: request.log },
      );
      return reply.status(created ? 201 : 200).send(photo);
    },
  );
};
