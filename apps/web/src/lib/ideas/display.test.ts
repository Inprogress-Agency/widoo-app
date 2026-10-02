import { messages } from '@/messages';
import { describe, expect, it } from 'vitest';
import { describeExampleRoute, filledStarsWidth } from './display';
import type { ExampleRoute } from './types';

const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

const canal: ExampleRoute = {
  id: 'r1',
  title: 'Canal Saint-Martin au fil de l’eau',
  durationMin: 180,
  budgetPerPersonEur: 26.5,
  rating: { average: 4.8, count: 86 },
  author: { kind: 'member', firstName: 'camille' },
};

describe('describeExampleRoute', () => {
  it('writes the example route of the mockup E-21 in French', () => {
    const display = describeExampleRoute(canal, 'fr', messages.fr);
    expect(plain(display.meta)).toBe('3 h, 25 €, par camille');
    expect(display.authorInitial).toBe('C');
    expect(display.rating && { ...display.rating, reviews: plain(display.rating.reviews) }).toEqual(
      { average: 4.8, value: '4,8', reviews: '(86 avis)', spoken: 'Noté 4,8 sur 5, 86 avis' },
    );
  });

  it('writes a free route of the team in English, without initial', () => {
    const display = describeExampleRoute(
      { ...canal, durationMin: 90, budgetPerPersonEur: 0, author: { kind: 'widoo' } },
      'en',
      messages.en,
    );
    expect(plain(display.meta)).toBe('1 h 30 min, free, by Widoo');
    expect(display.authorInitial).toBeNull();
  });

  it('hides the rating of a route without reviews', () => {
    expect(describeExampleRoute({ ...canal, rating: null }, 'fr', messages.fr).rating).toBeNull();
  });
});

describe('filledStarsWidth', () => {
  it('fills the stars to the tenth, as measured on the mockups', () => {
    expect(filledStarsWidth(4.8, 15, 2)).toBe(80);
    expect(filledStarsWidth(4.7, 13, 2)).toBe(69.1);
    expect(filledStarsWidth(4.9, 13, 2)).toBe(71.7);
  });

  it('fills the five stars without the gap after the last one, and none below zero', () => {
    expect(filledStarsWidth(5, 15, 2)).toBe(83);
    expect(filledStarsWidth(-1, 15, 2)).toBe(0);
  });
});
