import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

/** Strong ETag of a serialized body. */
export const etagOf = (body: string) =>
  `"${createHash('sha256').update(body).digest('base64url').slice(0, 27)}"`;

/** `If-None-Match` holds the tag, `*`, or the tag among others (weak comparison, RFC 9110). */
export function matchesIfNoneMatch(header: string | undefined, etag: string): boolean {
  if (!header) return false;
  return header
    .split(',')
    .map((tag) => tag.trim().replace(/^W\//, ''))
    .some((tag) => tag === '*' || tag === etag);
}

/**
 * Public reads of a plugin (wiki API › conventions): a successful answer is cacheable
 * `maxAgeSeconds` by the app and any shared cache, with an ETag; a request that already holds
 * it gets 304 without a body. Errors are left uncached. Never for personal data.
 */
export function registerPublicCache(app: FastifyInstance, maxAgeSeconds: number): void {
  app.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode !== 200 || typeof payload !== 'string') return payload;
    const etag = etagOf(payload);
    reply.header('cache-control', `public, max-age=${maxAgeSeconds}`);
    reply.header('etag', etag);
    if (matchesIfNoneMatch(request.headers['if-none-match'], etag)) {
      reply.code(304);
      return '';
    }
    return payload;
  });
}
