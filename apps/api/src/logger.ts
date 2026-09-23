import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { FastifyRequest, FastifyServerOptions } from 'fastify';

const WELL_FORMED_ID = /^[\w-]{1,64}$/;

/** Keeps the caller's `x-request-id` when it is well formed, so that one id follows a request across services. */
export function requestIdOf(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  return typeof header === 'string' && WELL_FORMED_ID.test(header) ? header : randomUUID();
}

export type LogStream = { write: (line: string) => void };

/**
 * JSON lines for Cloud Logging, without personal data: a request is logged by method and
 * path only (no IP, no query string, which may carry a position or a share token, no headers).
 */
export function loggerOptions(level: string, stream?: LogStream): FastifyServerOptions['logger'] {
  return {
    level,
    ...(stream && { stream }),
    serializers: {
      req: (request: FastifyRequest) => ({
        method: request.method,
        path: request.url.split('?')[0],
      }),
    },
    // Last line of defense if a handler logs headers on purpose.
    redact: {
      paths: [
        'headers.authorization',
        'headers.cookie',
        '*.headers.authorization',
        '*.headers.cookie',
      ],
      remove: true,
    },
  };
}
