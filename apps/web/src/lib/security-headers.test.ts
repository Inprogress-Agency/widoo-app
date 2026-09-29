import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from './security-headers';

describe('contentSecurityPolicy', () => {
  it('closes every source but the site itself in production', () => {
    const policy = contentSecurityPolicy(false);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('ws:');
  });

  it('opens eval and the hot reload WebSocket in development only', () => {
    const policy = contentSecurityPolicy(true);
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain('ws:');
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});

describe('securityHeaders', () => {
  it('sends the headers named by the Site-Web page', () => {
    const names = securityHeaders(false).map((header) => header.key);
    expect(names).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'Referrer-Policy',
      ]),
    );
  });

  it('never sets a cookie', () => {
    expect(securityHeaders(false).some((header) => /cookie/i.test(header.key))).toBe(false);
  });
});
