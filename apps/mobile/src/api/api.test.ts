import { ApiRequestError } from '@widoo/api-client';
import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './api-url';
import { shouldRetry } from './retry';

describe('resolveApiUrl', () => {
  it('prefers EXPO_PUBLIC_API_URL', () => {
    const envUrl = 'https://api.example.com';
    expect(resolveApiUrl({ envUrl, hostUri: '192.168.1.20:8081', isDev: true })).toBe(envUrl);
    expect(resolveApiUrl({ envUrl, hostUri: undefined, isDev: false })).toBe(envUrl);
  });

  it('reaches the local API on the machine that serves the bundle, in development', () => {
    const url = resolveApiUrl({ envUrl: undefined, hostUri: '192.168.1.20:8081', isDev: true });
    expect(url).toBe('http://192.168.1.20:8080');
  });

  it('refuses plain HTTP outside development', () => {
    const sources = { envUrl: 'http://api.example.com', hostUri: undefined };
    expect(() => resolveApiUrl({ ...sources, isDev: false })).toThrow('https');
    expect(resolveApiUrl({ ...sources, isDev: true })).toBe('http://api.example.com');
  });

  it('refuses a build without URL rather than guessing one', () => {
    const sources = { envUrl: '', hostUri: '192.168.1.20:8081' };
    expect(() => resolveApiUrl({ ...sources, isDev: false })).toThrow('EXPO_PUBLIC_API_URL');
    expect(() => resolveApiUrl({ envUrl: undefined, hostUri: undefined, isDev: true })).toThrow();
  });
});

describe('shouldRetry', () => {
  const http = (status: number) => new ApiRequestError('http', status, null);

  it('retries a missing answer or a server error, twice at most', () => {
    expect(shouldRetry(0, new ApiRequestError('network', null, null))).toBe(true);
    expect(shouldRetry(1, new ApiRequestError('timeout', null, null))).toBe(true);
    expect(shouldRetry(0, http(503))).toBe(true);
    expect(shouldRetry(2, http(503))).toBe(false);
  });

  it('does not retry a client error, an unreadable body or an unknown error', () => {
    expect(shouldRetry(0, http(404))).toBe(false);
    expect(shouldRetry(0, http(429))).toBe(false);
    expect(shouldRetry(0, new ApiRequestError('invalid_response', 200, null))).toBe(false);
    expect(shouldRetry(0, new TypeError('boom'))).toBe(false);
  });
});
