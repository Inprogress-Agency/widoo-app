import type { FastifyBaseLogger } from 'fastify';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createDb, createSql } from '../db/client';
import { testConfig } from '../test-config';
import { transitionTransportOf } from './transport';

const sql = createSql(testConfig().databaseUrl);
const db = createDb(sql);
afterAll(() => sql.end());

const logger = () =>
  ({ warn: vi.fn() }) as unknown as FastifyBaseLogger & { warn: ReturnType<typeof vi.fn> };
const token = 'sk.fictitious-directions-token-0123456789';

describe('transitionTransportOf', () => {
  it('has no provider without a token, and says every transition is estimated', () => {
    const log = logger();
    const transport = transitionTransportOf(
      { mapboxDirectionsToken: undefined, directionsCacheDays: 0 },
      db,
      log,
    );
    expect(transport).toEqual({ directions: null, cache: null });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('MAPBOX_DIRECTIONS_TOKEN'));
  });

  it('caches nothing by default, and the days set otherwise', () => {
    const log = logger();
    const withoutCache = transitionTransportOf(
      { mapboxDirectionsToken: token, directionsCacheDays: 0 },
      db,
      log,
    );
    expect(withoutCache.directions).not.toBeNull();
    expect(withoutCache.cache).toBeNull();
    const withCache = transitionTransportOf(
      { mapboxDirectionsToken: token, directionsCacheDays: 30 },
      db,
      log,
    );
    expect(withCache.cache).not.toBeNull();
    expect(log.warn).not.toHaveBeenCalled();
  });
});
