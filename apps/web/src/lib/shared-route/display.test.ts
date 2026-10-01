import { messages } from '@/messages';
import { describe, expect, it } from 'vitest';
import { describeSharedRoute } from './display';
import { sharedRouteFixtures } from './fixtures';
import type { SharedRoute } from './types';

const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

function fixture(key: string): SharedRoute {
  const result = sharedRouteFixtures[key];
  if (result?.kind !== 'public' && result?.kind !== 'private') throw new Error(key);
  return result.route;
}

const montmartre = fixture('demo-public');

describe('describeSharedRoute', () => {
  it('writes the card of the mockup E-21 in French', () => {
    const display = describeSharedRoute(montmartre, 'fr', messages.fr);
    expect({
      ...display,
      duration: plain(display.duration),
      budget: { text: plain(display.budget.text), spoken: plain(display.budget.spoken) },
      distance: plain(display.distance),
      steps: { ...display.steps, text: plain(display.steps.text) },
      rating: display.rating && { ...display.rating, reviews: plain(display.rating.reviews) },
    }).toEqual({
      place: 'Culture, 18e, Abbesses',
      duration: '7 h',
      budget: { text: '≈ 40 €', spoken: 'environ 40 € par personne' },
      distance: '6,1 km',
      steps: { text: '4 étapes', count: '4' },
      rating: { value: '4,9', reviews: '(128 avis)', spoken: 'Noté 4,9 sur 5, 128 avis' },
      author: 'Par Widoo',
      authorInitial: null,
    });
  });

  it('writes the same card in English', () => {
    const display = describeSharedRoute(montmartre, 'en', messages.en);
    expect(display.place).toBe('Culture, 18e, Abbesses');
    expect(plain(display.budget.text)).toBe('≈ €40');
    expect(display.author).toBe('By Widoo');
  });

  it('names the creator of a private route, without rating', () => {
    const display = describeSharedRoute(fixture('demo-private'), 'fr', messages.fr, {
      isPrivate: true,
    });
    expect(display.author).toBe('Partagé par Camille, visible seulement avec le lien');
    expect(display.authorInitial).toBe('C');
    expect(display.rating).toBeNull();
  });

  it('names the creator of a public route', () => {
    const display = describeSharedRoute(fixture('demo-private'), 'fr', messages.fr);
    expect(display.author).toBe('Par Camille');
  });

  it('shows a free route as free, and a single step in the singular', () => {
    const display = describeSharedRoute(
      { ...montmartre, budgetPerPersonEur: 0, stepCount: 1 },
      'fr',
      messages.fr,
    );
    expect(display.budget).toEqual({ text: 'Gratuit', spoken: 'Gratuit' });
    expect(plain(display.steps.text)).toBe('1 étape');
  });

  it('leaves out what the route does not have in its place line', () => {
    const display = describeSharedRoute(
      { ...montmartre, mood: null, district: null },
      'fr',
      messages.fr,
    );
    expect(display.place).toBe('Abbesses');
  });
});
