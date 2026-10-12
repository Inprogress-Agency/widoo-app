import { canOpenAdminSection, hasRole, type AdminSection, type UserRole } from '@widoo/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { httpError } from '../errors';
import { findOrCreateUser, type User } from '../users/repository';
import { InvalidTokenError, type TokenVerifier, type VerifiedIdentity } from './verifier';

/** Hook of an authenticated route, to use as `onRequest`: runs before the body is parsed. */
type AuthHook = (request: FastifyRequest) => Promise<void>;

declare module 'fastify' {
  interface FastifyInstance {
    /** Refuses the request without a valid token for an active account (401). */
    requireAuth: AuthHook;
    /** `requireAuth`, then refuses a role that does not hold `role` (403). */
    requireRole: (role: Exclude<UserRole, 'user'>) => AuthHook;
    /**
     * Guard of the admin routes (wiki Admin-Web › Rôles et Principes): `requireAuth`, then refuses
     * a role that does not open `section` (403), a session older than 12 hours (401) and a
     * session opened without a second factor (403 `mfa_required`, D-087).
     */
    requireAdminSection: (section: AdminSection) => AuthHook;
    /**
     * Optional authentication (wiki API › conventions): without an `Authorization` header the
     * caller stays anonymous; with one, the same checks as `requireAuth`, 401 included.
     */
    optionalAuth: AuthHook;
  }
  interface FastifyRequest {
    /** The account of the caller, read from the database; null until an auth hook ran. */
    user: User | null;
    /** What the verified token says of the session; null until an auth hook ran. */
    identity: VerifiedIdentity | null;
  }
}

// Wiki Admin-Web › Principes: a session of the admin lasts 12 hours at most, then A-01.
const adminSessionMaxMs = 12 * 60 * 60 * 1000;

// A Firebase ID token is about 1 KB; the bound keeps oversized headers away from the verifier.
const BEARER = /^Bearer ([^\s]{1,4096})$/i;

export type AuthOptions = {
  /**
   * False only with the local Auth emulator, which has no TOTP: the admin routes then let a
   * session without a second factor in. Always true on staging and production.
   */
  isSecondFactorRequired: boolean;
};

/**
 * Authentication on demand: public routes stay public, authenticated routes declare
 * `onRequest: app.requireAuth` or `app.requireRole(...)`, a public route whose answer depends on
 * the caller `app.optionalAuth`. The role always comes from the database, read again on every
 * request, never from the token.
 */
export function registerAuth(
  app: FastifyInstance,
  verifier: TokenVerifier,
  options: AuthOptions,
): void {
  app.decorateRequest('user', null);
  app.decorateRequest('identity', null);

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
    // Refused everywhere, the app included: the account can no longer sign in (A-06).
    if (user.suspendedAt) {
      throw httpError(403, 'Account suspended', 'account_suspended');
    }
    request.user = user;
    request.identity = identity;
    return user;
  }

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    await authenticate(request);
  });
  // An invalid or expired token is refused, never read as anonymous: the app refreshes it.
  app.decorate('optionalAuth', async (request: FastifyRequest) => {
    if (request.headers.authorization !== undefined) {
      await authenticate(request);
    }
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
  app.decorate('requireAdminSection', (section: AdminSection) => async (request) => {
    const user = await authenticate(request);
    // The role first: an account outside the team learns nothing about the admin.
    if (!canOpenAdminSection(user.role, section)) {
      throw httpError(403, 'Insufficient role');
    }
    const identity = request.identity;
    if (!identity || Date.now() - identity.authTime.getTime() > adminSessionMaxMs) {
      throw httpError(401, 'Admin session expired');
    }
    if (options.isSecondFactorRequired && !identity.secondFactor) {
      throw httpError(403, 'Second factor required', 'mfa_required');
    }
  });
}
