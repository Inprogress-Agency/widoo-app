import { describe, expect, it } from 'vitest';
import { counterLabel } from './counter-label';

describe('counterLabel', () => {
  it('says what is counted', () => {
    expect(counterLabel('moderation', { count: 12, lateCount: 0 })).toBe('12 parcours à relire');
  });

  it('says how many are late, never by the color alone', () => {
    expect(counterLabel('moderation', { count: 12, lateCount: 2 })).toBe(
      '12 parcours à relire, dont 2 en retard',
    );
  });

  it('agrees in number', () => {
    expect(counterLabel('support', { count: 1, lateCount: 0 })).toBe('1 message à traiter');
    expect(counterLabel('support', { count: 4, lateCount: 1 })).toBe(
      '4 messages à traiter, dont 1 en retard',
    );
  });
});
