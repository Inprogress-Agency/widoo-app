import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.1.0' } } }));
vi.mock('react-native', () => ({ Linking: {}, Platform: { OS: 'ios' } }));
vi.mock('react-native-mmkv', () => ({ createMMKV: () => ({ getString: () => undefined }) }));
vi.mock('../profile/me', () => ({ useAppConfig: () => ({}) }));

const { createRecommendedMemory } = await import('./appUpdate');

describe('createRecommendedMemory', () => {
  it('offers each recommended version once', () => {
    const values = new Map<string, string>();
    const memory = createRecommendedMemory({
      getString: (key) => values.get(key),
      set: (key, value) => void values.set(key, value),
    });
    expect(memory.isOffered('0.2.0')).toBe(false);
    memory.setOffered('0.2.0');
    expect(memory.isOffered('0.2.0')).toBe(true);
    expect(memory.isOffered('0.3.0')).toBe(false);
  });
});
