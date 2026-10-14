import { describe, expect, it } from 'vitest';
import { SupportMessageInput, supportMessageMaxLength } from '.';

describe('SupportMessageInput', () => {
  const input = {
    topic: 'data',
    message: 'Bonjour,\nje voudrais une copie de mes données.',
    replyEmail: ' camille@example.com ',
    appVersion: '1.2.0',
    device: 'iPhone 15, iOS 18.2',
    locale: 'fr',
  };

  it('accepts a message on several lines and trims the address', () => {
    expect(SupportMessageInput.parse(input)).toEqual({
      ...input,
      replyEmail: 'camille@example.com',
    });
  });

  it.each([
    ['an unknown topic', { topic: 'complaint' }],
    ['an empty message', { message: '   ' }],
    ['a message too long', { message: 'a'.repeat(supportMessageMaxLength + 1) }],
    ['markup', { message: '<script>alert(1)</script>' }],
    ['a control character', { message: 'Bonjour\u0007' }],
    ['an invalid address', { replyEmail: 'camille@' }],
    ['a malformed version', { appVersion: '1.2' }],
    ['an unknown key', { userId: '00000000-0000-0000-0000-000000000000' }],
  ])('refuses %s', (_case, change) => {
    expect(SupportMessageInput.safeParse({ ...input, ...change }).success).toBe(false);
  });
});
