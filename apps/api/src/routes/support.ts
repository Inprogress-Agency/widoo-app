import { ApiError, SupportMessageInput, SupportMessageReceipt } from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createSupportMessage } from '../support/repository';

/**
 * Messages per hour (E-19 › Nous écrire): by account with a token, by client IP without, so that
 * a signed-in user behind a shared address keeps their own quota. Counted per instance.
 */
export const SUPPORT_RATE_LIMIT = 5;

/** A message is 1 000 characters: the body never needs more. */
const BODY_LIMIT_BYTES = 16 * 1024;

/** The account once `optionalAuth` ran (onRequest), else the client IP; invalid bodies count. */
const supportRateKey = (request: FastifyRequest) =>
  request.user ? `user:${request.user.id}` : `ip:${request.ip}`;

/**
 * `POST /support/messages` (wiki API, D-063): the form « Nous écrire », with or without a token.
 * Stored for the team; the body is never logged (the logger keeps the method and the path).
 */
export const supportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/support/messages',
    {
      onRequest: app.optionalAuth,
      bodyLimit: BODY_LIMIT_BYTES,
      config: {
        rateLimit: {
          max: SUPPORT_RATE_LIMIT,
          timeWindow: '1 hour',
          hook: 'preValidation',
          keyGenerator: supportRateKey,
        },
      },
      schema: {
        tags: ['support'],
        summary: 'Send a message to the support, with or without an account',
        body: SupportMessageInput,
        response: { 201: SupportMessageReceipt, 422: ApiError, 429: ApiError },
      },
    },
    async (request, reply) => {
      const receipt = await createSupportMessage(app.db, request.user?.id ?? null, request.body);
      request.log.info({ supportMessageId: receipt.id }, 'support message stored');
      reply.header('cache-control', 'no-store');
      return reply.status(201).send(receipt);
    },
  );
};
