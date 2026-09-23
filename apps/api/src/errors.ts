import type { ApiError, ApiErrorCode, ValidationIssue } from '@widoo/shared';
import { DrizzleQueryError } from 'drizzle-orm';
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
 * A failed query as it may be logged. Drizzle writes the query parameters into its message and
 * stack, and the driver error may quote a value or the failing row: personal data (e-mail, first
 * name). Only the SQL text, parameterized, and the SQLSTATE code and constraint are kept.
 */
export function loggableError(error: Error): Error {
  if (!(error instanceof DrizzleQueryError)) {
    return error;
  }
  // Own properties of the postgres.js error: `code` (SQLSTATE), `constraint_name`.
  const cause: Record<string, unknown> = { ...error.cause };
  const safe = Object.assign(new Error(`Failed query: ${error.query}`), {
    code: cause.code,
    constraint: cause.constraint_name,
  });
  safe.name = 'DrizzleQueryError';
  const frames = (error.stack ?? '').split('\n').filter((line) => /^\s+at /.test(line));
  safe.stack = [`${safe.name}: ${safe.message}`, ...frames].join('\n');
  return safe;
}

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

    request.log.error({ err: loggableError(error) }, 'unhandled error');
    const body: ApiError = { code: 'internal_error', message: 'Internal server error' };
    return reply.status(500).send(body);
  });

  // Rate limited like any route, so that probing for URLs is throttled too.
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (_request, reply) => {
    const body: ApiError = { code: 'not_found', message: 'Route not found' };
    return reply.status(404).send(body);
  });
}
