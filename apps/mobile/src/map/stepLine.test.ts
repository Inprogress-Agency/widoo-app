import type { RouteCard } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import { stepLine } from './stepLine';

const t = i18next.t;
const nbsp = '\u00a0';
const step: RouteCard['steps'][number] = {
  category: 'walk',
  location: { lat: 48.86, lng: 2.35 },
  name: 'Canal Saint-Martin',
  durationMin: 20,
};

describe('stepLine', () => {
  it('names the place, then the step, its category and its time on the spot', () => {
    expect(stepLine(t, step, 1, 4)).toEqual({
      name: 'Canal Saint-Martin',
      detail: `Étape 1/4 · Balade · 20${nbsp}min`,
      spoken: 'Canal Saint-Martin, Balade, 20 minutes',
      dotLabel: 'Étape 1 sur 4, Canal Saint-Martin, Balade',
    });
  });

  it('shows the category in place of a missing name, once', () => {
    expect(stepLine(t, { ...step, name: null, durationMin: null }, 1, 5)).toEqual({
      name: 'Balade',
      detail: 'Étape 1/5',
      spoken: 'Balade',
      dotLabel: 'Étape 1 sur 5, Balade',
    });
  });

  it('numbers any step of the route, not only its start', () => {
    const line = stepLine(t, { ...step, name: 'Café fictif', category: 'cafe' }, 3, 4);
    expect(line.detail).toBe(`Étape 3/4 · Café · 20${nbsp}min`);
    expect(line.dotLabel).toBe('Étape 3 sur 4, Café fictif, Café');
  });
});
