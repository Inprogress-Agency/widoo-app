import type { ApiError, ApiErrorCode, ValidationIssue } from '@widoo/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

const codeByStatus: Partial<Record<number, ApiErrorCode>> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

/**
 * Registered after the rate limit plugin. Every error leaves the API as an `ApiError`. Client errors keep their message; anything
 * else becomes a generic 500 whose cause is only logged, never sent.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const location = error.validationContext ?? 'body';
      const issues: ValidationIssue[] = error.validation.map((issue) => ({
        location,
        path: issue.instancePath.slice(1).replaceAll('/', '.'),
        code: issue.keyword,
        message: issue.message ?? 'Invalid value',
      }));
      const body: ApiError = {
        code: 'validation_error',
        message: 'Invalid request',
        details: { issues },
      };
      return reply.status(400).send(body);
    }

    const status = error.statusCode ?? 500;
    if (status >= 400 && status < 500) {
      // Other client errors raised by Fastify (malformed JSON, body too large...) are validation errors.
      const body: ApiError = {
        code: codeByStatus[status] ?? 'validation_error',
        message: error.message,
      };
      return reply.status(status).send(body);
    }

    request.log.error({ err: error }, 'unhandled error');
    const body: ApiError = { code: 'internal_error', message: 'Internal server error' };
    return reply.status(500).send(body);
  });

  // Rate limited like any route, so that probing for URLs is throttled too.
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (_request, reply) => {
    const body: ApiError = { code: 'not_found', message: 'Route not found' };
    return reply.status(404).send(body);
  });
}
