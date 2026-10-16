import { describe, expect, it } from 'vitest';
import { planLabelOf, userNameOf } from './user-display';

const now = new Date('2026-10-16T10:00:00Z');

describe('userNameOf', () => {
  it('prefers the first name, then the address', () => {
    expect(userNameOf({ firstName: 'Léa', email: 'lea@example.com' })).toBe('Léa');
    expect(userNameOf({ firstName: null, email: 'lea@example.com' })).toBe('lea@example.com');
    expect(userNameOf({ firstName: null, email: null })).toBe('Sans prénom');
  });
});

describe('planLabelOf', () => {
  it('names the free plan', () => {
    expect(planLabelOf({ plan: 'free', source: 'store', expiresAt: null }, now)).toBe('Gratuit');
  });

  it('says where Premium comes from and until when', () => {
    const expiresAt = '2026-12-01T10:00:00.000Z';
    expect(planLabelOf({ plan: 'premium', source: 'gift', expiresAt }, now)).toBe(
      "Offert, jusqu'au 1 décembre",
    );
    expect(planLabelOf({ plan: 'premium', source: 'store', expiresAt: null }, now)).toBe(
      'Abonnement ou pass, sans fin',
    );
  });

  it('reads a past end as ended', () => {
    const expiresAt = '2026-10-01T10:00:00.000Z';
    expect(planLabelOf({ plan: 'premium', source: 'gift', expiresAt }, now)).toBe(
      'Offert, terminé',
    );
  });
});
