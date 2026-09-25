import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import { formatDuration } from './duration';

const t = i18next.t;
const nbsp = ' ';

describe('formatDuration', () => {
  it('writes minutes, hours, and hours with minutes, spaces unbreakable', () => {
    expect(formatDuration(t, 45, 'short')).toBe(`45${nbsp}min`);
    expect(formatDuration(t, 420, 'short')).toBe(`7${nbsp}h`);
    expect(formatDuration(t, 150, 'short')).toBe(`2${nbsp}h${nbsp}30`);
    expect(formatDuration(t, 65, 'short')).toBe(`1${nbsp}h${nbsp}05`);
  });

  it('says the duration in words for the screen reader, singular at 1', () => {
    expect(formatDuration(t, 1, 'spoken')).toBe('1 minute');
    expect(formatDuration(t, 45, 'spoken')).toBe('45 minutes');
    expect(formatDuration(t, 60, 'spoken')).toBe('1 heure');
    expect(formatDuration(t, 420, 'spoken')).toBe('7 heures');
    expect(formatDuration(t, 90, 'spoken')).toBe('1 heure 30');
    expect(formatDuration(t, 150, 'spoken')).toBe('2 heures 30');
  });
});
