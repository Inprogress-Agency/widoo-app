import { describe, expect, it } from 'vitest';
import { chooseAnalyticsSink } from './sink';

const KEY = 'phc_fictitious';

describe('chooseAnalyticsSink', () => {
  it.each([undefined, '', 'development'])(
    'creates no PostHog client in development (%s), even with a key',
    (appEnv) => {
      for (const posthogKey of [undefined, '', KEY]) {
        expect(chooseAnalyticsSink({ appEnv, posthogKey, isDebugLog: false })).toBe('none');
      }
    },
  );

  it.each([undefined, '', 'development'])(
    'keeps the local log in development (%s), with or without a key',
    (appEnv) => {
      for (const posthogKey of [undefined, '', KEY]) {
        expect(chooseAnalyticsSink({ appEnv, posthogKey, isDebugLog: true })).toBe('log');
      }
    },
  );

  it.each(['preview', 'production'])('creates the PostHog client in %s with a key', (appEnv) => {
    expect(chooseAnalyticsSink({ appEnv, posthogKey: KEY, isDebugLog: false })).toBe('posthog');
    expect(chooseAnalyticsSink({ appEnv, posthogKey: KEY, isDebugLog: true })).toBe('posthog');
  });

  it.each(['preview', 'production'])('sends nothing in %s without a key', (appEnv) => {
    for (const posthogKey of [undefined, '']) {
      expect(chooseAnalyticsSink({ appEnv, posthogKey, isDebugLog: false })).toBe('none');
    }
  });

  it('ignores the key in an unknown environment', () => {
    for (const appEnv of ['staging', 'Production', ' preview']) {
      expect(chooseAnalyticsSink({ appEnv, posthogKey: KEY, isDebugLog: false })).toBe('none');
    }
  });
});
