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
    });
  });

  it('shows the category in place of a missing name, once', () => {
    expect(stepLine(t, { ...step, name: null, durationMin: null }, 1, 5)).toEqual({
      name: 'Balade',
      detail: 'Étape 1/5',
      spoken: 'Balade',
    });
  });
});
