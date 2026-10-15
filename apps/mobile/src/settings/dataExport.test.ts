import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({}));
vi.mock('expo-sharing', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const { exportFileName } = await import('./dataExport');

describe('exportFileName', () => {
  it('names the file after the day of the phone', () => {
    expect(exportFileName(new Date(2026, 9, 5, 23, 30))).toBe('widoo-donnees-2026-10-05.json');
  });
});
