import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, responseHeaders } from './response-headers';

const production = {
  dev: false,
  apiOrigin: 'https://api.example',
  authDomain: 'widoo.firebaseapp.com',
};

const headerValue = (name: string) =>
  responseHeaders(production).find((header) => header.key === name)?.value;

describe('responseHeaders', () => {
  it('keeps the admin out of search engines', () => {
    expect(headerValue('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('forbids every cache', () => {
    expect(headerValue('Cache-Control')).toBe('no-store');
  });

  it('forbids framing', () => {
    expect(headerValue('X-Frame-Options')).toBe('DENY');
    expect(headerValue('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  });
});

describe('contentSecurityPolicy', () => {
  it('lets the pages call the admin, the API and Firebase Authentication only', () => {
    expect(contentSecurityPolicy(production)).toContain(
      "connect-src 'self' https://api.example https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;",
    );
  });

  it('frames the sign-in window of the project only', () => {
    expect(contentSecurityPolicy(production)).toContain('frame-src https://widoo.firebaseapp.com;');
  });

  it('calls the Auth emulator instead of Firebase when one is set', () => {
    const policy = contentSecurityPolicy({
      ...production,
      dev: true,
      authEmulatorOrigin: 'http://127.0.0.1:9099',
    });
    expect(policy).toContain("connect-src 'self' https://api.example http://127.0.0.1:9099 ws:;");
    expect(policy).not.toContain('identitytoolkit');
  });

  it('allows neither eval nor a WebSocket in production', () => {
    const policy = contentSecurityPolicy(production);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain('ws:');
    expect(policy).toContain('upgrade-insecure-requests');
  });

  it('allows what the hot reload needs in development', () => {
    const policy = contentSecurityPolicy({ ...production, dev: true });
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain('ws:');
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});
