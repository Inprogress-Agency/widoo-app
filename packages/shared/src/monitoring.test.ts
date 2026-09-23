import { describe, expect, it } from 'vitest';
import { redactText, scrubBreadcrumb, scrubEvent, type ReportEvent } from './monitoring';

// Fictitious values only.
const email = 'leak.test@example.com';
const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJmaWN0aXRpb3VzIn0.c2lnbmF0dXJl';
const leaks = [email, jwt, 'fictitious', 'secret', 'bbox', '203.0.113.7', 'Authorization'];

function reportEvent(): ReportEvent & Record<string, unknown> {
  return {
    user: { id: '0199a0b2-0000-7000-8000-000000000001', email, ip_address: '203.0.113.7' },
    message: `Sign-in failed for ${email}`,
    request: {
      url: 'https://api.example.com/v1/search?bbox=2.29,48.85,2.30,48.86&token=abc',
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Cookie: 'session=fictitious', 'user-agent': 'ua' },
      ...{
        data: { email },
        cookies: { session: 'fictitious' },
        env: { REMOTE_ADDR: '203.0.113.7' },
      },
    },
    exception: { values: [{ value: `Token ${jwt} rejected` }] },
    breadcrumbs: [
      { category: 'console', message: `user ${email}` },
      {
        category: 'fetch',
        data: {
          url: 'https://api.example.com/v1/me?share=secret',
          method: 'GET',
          'http.query': '?share=secret',
          'http.fragment': '#secret',
        },
      },
    ],
  };
}

describe('redactText', () => {
  it('masks bearer tokens, bare JWTs and e-mail addresses', () => {
    expect(redactText(`Authorization: Bearer ${jwt}`)).toBe('Authorization: Bearer [redacted]');
    expect(redactText(`token=${jwt}`)).toBe('token=[jwt]');
    expect(redactText(`Contact ${email}.`)).toBe('Contact [email].');
    expect(redactText('Failed query: select 1')).toBe('Failed query: select 1');
  });
});

describe('scrubEvent', () => {
  it('leaves no e-mail, token, cookie, body, query string or IP address', () => {
    const event = reportEvent();
    scrubEvent(event, { keepUserId: true });
    const sent = JSON.stringify(event);
    for (const leak of leaks) {
      expect(sent).not.toContain(leak);
    }
    expect(event.request).toEqual({
      url: 'https://api.example.com/v1/search',
      method: 'GET',
      headers: { 'user-agent': 'ua' },
    });
    expect(event.message).toBe('Sign-in failed for [email]');
    expect(event.breadcrumbs).toEqual([
      { category: 'fetch', data: { url: 'https://api.example.com/v1/me', method: 'GET' } },
    ]);
  });

  it('keeps the opaque user id only when asked', () => {
    const kept = reportEvent();
    scrubEvent(kept, { keepUserId: true });
    expect(kept.user).toEqual({ id: '0199a0b2-0000-7000-8000-000000000001' });
    const removed = reportEvent();
    scrubEvent(removed, { keepUserId: false });
    expect(removed.user).toBeUndefined();
  });
});

describe('scrubBreadcrumb', () => {
  it('drops console output and keeps other breadcrumbs', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'log' })).toBeNull();
    expect(scrubBreadcrumb({ category: 'navigation', message: 'to /profile' })).toEqual({
      category: 'navigation',
      message: 'to /profile',
    });
  });
});
