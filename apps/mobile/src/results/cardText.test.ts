import type { RouteCard } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import { cardText } from './cardText';

const t = i18next.t;
const nbsp = ' ';

const route: RouteCard = {
  id: '0190a4b2-0000-7000-8000-000000000001',
  title: "Canal Saint-Martin au fil de l'eau",
  coverUrl: null,
  isOfficial: false,
  author: { id: '0190a4b2-0000-7000-8000-000000000002', firstName: 'Camille', avatarUrl: null },
  access: 'free',
  isVerified: true,
  moods: ['nature', 'relax'],
  audiences: ['couple'],
  district: '10e',
  neighborhood: 'République',
  durationMin: 180,
  durationBucket: 'half_day',
  budgetPerPersonEur: { min: 20, max: 30 },
  budgetBucket: 'low',
  distanceM: 4200,
  rating: { average: 4.8, count: 12 },
  steps: [{ category: 'walk', location: { lat: 48.8674, lng: 2.3636 } }],
};

describe('cardText', () => {
  it('writes the place, the creator, the budget and the duration of a card', () => {
    const text = cardText(t, route, null);
    expect(text.place).toBe('Nature · 10e · République');
    expect(text.creator).toBe('Par Camille');
    expect(text.budget.amount).toBe(`≈${nbsp}25${nbsp}€`);
    expect(text.duration.short).toBe(`3${nbsp}h`);
    expect(text.distance).toBeNull();
  });

  it('reads the whole card in one label, the distance only with a position', () => {
    const near = { lat: 48.8532, lng: 2.3692 };
    expect(cardText(t, route, near).label).toBe(
      "Canal Saint-Martin au fil de l'eau, Nature, 10e, République, Par Camille, Note 4,8 sur 5, " +
        'Vérifié, environ 25 euros par personne, 3 heures, à 1,6 kilomètre',
    );
  });

  it('names Widoo, Signature and Premium for a route of the team, « Nouveau » without review', () => {
    const text = cardText(
      t,
      {
        ...route,
        isOfficial: true,
        author: null,
        access: 'premium',
        isVerified: false,
        district: null,
        rating: { average: null, count: 0 },
      },
      null,
    );
    expect(text.creator).toBe('Par Widoo');
    expect(text.place).toBe('Nature · République');
    expect(text.label).toContain('Par Widoo, Nouveau, Premium, Signature, environ 25 euros');
  });

  it('says « Membre Widoo » for an author whose profile is not public', () => {
    expect(cardText(t, { ...route, author: null }, null).creator).toBe('Membre Widoo');
  });
});
