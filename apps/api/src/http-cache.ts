import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

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

/** `Vary` with `field` added to what the reply already varies on (CORS may have set `Origin`). */
export function varyWith(current: unknown, field: string): string {
  const fields = String(current ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (fields.some((name) => name === '*' || name.toLowerCase() === field.toLowerCase())) {
    return fields.join(', ');
  }
  return [...fields, field].join(', ');
}

export type CacheOptions = {
  /**
   * The answer depends on the caller (optional authentication, D-075): the anonymous answer stays
   * public, an answer to an `Authorization` header is private and revalidated on each use, and
   * both vary on that header, so that no shared cache serves the answer of a caller to another.
   */
  dependsOnCaller?: boolean;
};

/**
 * `onSend` hook of a public read (wiki API › conventions): a successful answer is cacheable
 * `maxAgeSeconds` by the app and any shared cache, with an ETag of its own body; a request that
 * already holds it gets 304 without a body. Errors are left uncached. Never for personal data.
 */
export function cacheHook(maxAgeSeconds: number, { dependsOnCaller = false }: CacheOptions = {}) {
  return async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    if (reply.statusCode !== 200 || typeof payload !== 'string') return payload;
    const etag = etagOf(payload);
    const isPrivate = dependsOnCaller && request.headers.authorization !== undefined;
    // A private answer is kept by the caller's own cache only, and checked again before each use:
    // a change of right (purchase, end of plan) shows at the next request.
    reply.header(
      'cache-control',
      isPrivate ? 'private, no-cache' : `public, max-age=${maxAgeSeconds}`,
    );
    if (dependsOnCaller) {
      reply.header('vary', varyWith(reply.getHeader('vary'), 'Authorization'));
    }
    reply.header('etag', etag);
    if (matchesIfNoneMatch(request.headers['if-none-match'], etag)) {
      reply.code(304);
      return '';
    }
    return payload;
  };
}
