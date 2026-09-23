import { hasRole, type UserRole } from '@widoo/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { httpError } from '../errors';
import { findOrCreateUser, type User } from '../users/repository';
import { InvalidTokenError, type TokenVerifier } from './verifier';

/** Hook of an authenticated route, to use as `onRequest`: runs before the body is parsed. */
type AuthHook = (request: FastifyRequest) => Promise<void>;

declare module 'fastify' {
  interface FastifyInstance {
    /** Refuses the request without a valid token for an active account (401). */
    requireAuth: AuthHook;
    /** `requireAuth`, then refuses a role that does not hold `role` (403). */
    requireRole: (role: Exclude<UserRole, 'user'>) => AuthHook;
  }
  interface FastifyRequest {
    /** The account of the caller, read from the database; null until `requireAuth` ran. */
    user: User | null;
  }
}

// A Firebase ID token is about 1 KB; the bound keeps oversized headers away from the verifier.
const BEARER = /^Bearer ([^\s]{1,4096})$/i;

/**
 * Authentication on demand: public routes stay public, authenticated routes declare
 * `onRequest: app.requireAuth` or `app.requireRole(...)`. The role always comes from the
 * database, read again on every request, never from the token.
 */
export function registerAuth(app: FastifyInstance, verifier: TokenVerifier): void {
  app.decorateRequest('user', null);

  async function authenticate(request: FastifyRequest): Promise<User> {
    if (request.user) {
      return request.user;
    }
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!token) {
      throw httpError(401, 'Missing bearer token');
    }
    const identity = await verifier.verify(token).catch((error: unknown) => {
      if (error instanceof InvalidTokenError) {
        request.log.info({ reason: error.reason }, 'token refused');
        throw httpError(401, 'Invalid token');
      }
      throw error;
    });
    // Anonymous Firebase sessions, if ever enabled, must not create accounts.
    if (identity.signInProvider === 'anonymous') {
      throw httpError(401, 'Sign in required');
    }
    const user = await findOrCreateUser(app.db, identity);
    // Kept until the purge so that the same Firebase account cannot silently reopen it.
    if (user.deletedAt) {
      throw httpError(401, 'Account deleted');
    }
    request.user = user;
    return user;
  }

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    await authenticate(request);
  });
  app.decorate(
    'requireRole',
    (role: Exclude<UserRole, 'user'>) => async (request: FastifyRequest) => {
      const user = await authenticate(request);
      if (!hasRole(user.role, role)) {
        throw httpError(403, 'Insufficient role');
      }
    },
  );
}
