/**
 * What the API gives `computeTransitions`: Mapbox Directions with the server token, and the
 * Postgres cache while `MAPBOX_DIRECTIONS_CACHE_DAYS` is above 0.
 */
import type { TransitionTransport } from '@widoo/orchestration';
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { createDirectionsCache } from './cache';
import { createMapboxDirections } from './mapbox';

const DAY_MS = 24 * 60 * 60 * 1000;

export function transitionTransportOf(
  config: Pick<Config, 'mapboxDirectionsToken' | 'directionsCacheDays'>,
  db: Db,
  log: FastifyBaseLogger,
): TransitionTransport {
  if (!config.mapboxDirectionsToken) {
    log.warn('MAPBOX_DIRECTIONS_TOKEN is not set: every transition is estimated');
  }
  return {
    directions: config.mapboxDirectionsToken
      ? createMapboxDirections({
          token: config.mapboxDirectionsToken,
          onFailure: (failure) => log.warn({ directions: failure }, 'directions failed'),
        })
      : null,
    cache:
      config.directionsCacheDays > 0
        ? createDirectionsCache(db, {
            ttlMs: config.directionsCacheDays * DAY_MS,
            onError: (error, operation) =>
              log.warn({ err: error, operation }, 'directions cache failed'),
          })
        : null,
  };
}
