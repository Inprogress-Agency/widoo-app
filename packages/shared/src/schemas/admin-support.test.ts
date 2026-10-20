import { describe, expect, it } from 'vitest';
import { AdminSupportMessage, AdminSupportQuery } from './admin-support';

const message = {
  id: '0198c1de-0000-7000-8000-000000000001',
  topic: 'problem',
  author: { id: '0198c1de-0000-7000-8000-000000000002', firstName: 'Camille' },
  createdAt: '2026-10-20T09:00:00.000Z',
  handledAt: null,
  message: "L'app se ferme quand j'ouvre un parcours.",
  replyEmail: 'camille@example.com',
  appVersion: '0.1.0',
  device: 'iPhone 15, iOS 18.2',
  locale: 'fr',
};

describe('AdminSupportQuery', () => {
  it('takes no filter, or one of the two statuses, and refuses another', () => {
    expect(AdminSupportQuery.safeParse({}).success).toBe(true);
    expect(AdminSupportQuery.parse({ status: 'unhandled' })).toEqual({ status: 'unhandled' });
    expect(AdminSupportQuery.safeParse({ status: 'answered' }).success).toBe(false);
    expect(AdminSupportQuery.safeParse({ extra: 1 }).success).toBe(false);
  });
});

describe('AdminSupportMessage', () => {
  it('reads a message with an account, and one sent without', () => {
    expect(AdminSupportMessage.safeParse(message).success).toBe(true);
    expect(AdminSupportMessage.safeParse({ ...message, author: null }).success).toBe(true);
  });

  it('refuses an unknown subject or language', () => {
    expect(AdminSupportMessage.safeParse({ ...message, topic: 'complaint' }).success).toBe(false);
    expect(AdminSupportMessage.safeParse({ ...message, locale: 'de' }).success).toBe(false);
  });
});
