import * as Sentry from '@sentry/node';
import { scrubBreadcrumb, scrubEvent } from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { Config } from './config';

type MonitoringOptions = Pick<Config, 'sentryDsn' | 'sentryEnvironment'> & {
  /** Tests only: receives the envelopes instead of Sentry. */
  transport?: Sentry.NodeOptions['transport'];
};

/**
 * Error reports to Sentry (wiki Securite-et-RGPD: legitimate interest, 90 days). Without DSN,
 * nothing is sent. No tracing, no local variables, no default personal data; every event goes
 * through `scrubEvent`, which keeps the opaque user id only and drops credentials.
 */
export function initMonitoring({ sentryDsn, sentryEnvironment, transport }: MonitoringOptions) {
  if (!sentryDsn) {
    return;
  }
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    sendDefaultPii: false,
    includeLocalVariables: false,
    ...(transport && { transport }),
    beforeSend: (event) => {
      scrubEvent(event, { keepUserId: true });
      return event;
    },
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

/**
 * Reports an unhandled error, already cleaned by `loggableError`. The user is `users.id`, an
 * opaque UUID: never the Firebase uid nor the e-mail address.
 */
export function reportError(error: Error, request: FastifyRequest): void {
  Sentry.withScope((scope) => {
    scope.setTag('request_id', request.id);
    // Route pattern (`/v1/routes/:id`), not the URL with its ids and query string.
    scope.setTransactionName(`${request.method} ${request.routeOptions.url ?? 'unknown route'}`);
    if (request.user) {
      scope.setUser({ id: request.user.id });
    }
    Sentry.captureException(error);
  });
}

/** Sends the pending reports before the process exits. */
export const flushMonitoring = () => Sentry.close(2000);
