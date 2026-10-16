import { describe, expect, it } from 'vitest';
import { PlannedRouteStep, Step, StepHighlights, stepHighlightsMax } from '.';

// Fictitious data only.
const plannedStep = {
  id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e10',
  position: 0,
  title: null,
  description: 'Conseil fictif',
  durationMin: 45,
  costPerPersonEur: null,
  bookingRequired: false,
  bookingUrl: null,
  bookingProvider: null,
  transitionNote: null,
  transition: null,
  place: {
    id: '0192f0c4-7d3a-7b3e-9a41-3c5f2b6d8e11',
    name: 'Lieu fictif',
    category: 'museum',
    location: { lat: 48.86, lng: 2.35 },
    address: '1 rue Fictive, Paris',
    isIndoor: true,
    hours: [],
  },
};

describe('StepHighlights', () => {
  it('keeps 1 to 3 points in order, trimmed', () => {
    expect(StepHighlights.parse([' La cour pavée ', 'Le comptoir en zinc'])).toEqual([
      'La cour pavée',
      'Le comptoir en zinc',
    ]);
    expect(StepHighlights.parse(['Un', 'Deux', 'Trois'])).toHaveLength(stepHighlightsMax);
  });

  it.each([
    ['an empty list', []],
    ['a fourth point', ['Un', 'Deux', 'Trois', 'Quatre']],
    ['a blank point', ['Un', '  ']],
    ['markup', ['<b>Un</b>']],
    ['a line break', ['Un\nDeux']],
  ])('refuses %s', (_, highlights) => {
    expect(StepHighlights.safeParse(highlights).success).toBe(false);
  });
});

describe('content of a step (D-029)', () => {
  it('never carries the audio track of the creator', () => {
    for (const schema of [Step, PlannedRouteStep]) {
      expect(Object.keys(schema.shape).filter((key) => /audio/i.test(key))).toEqual([]);
    }
  });
});

describe('PlannedRouteStep', () => {
  it('freezes the points and the photos with their credit', () => {
    const photos = [
      { url: 'https://example.com/photos/etape.jpg', credit: null },
      {
        url: 'https://example.com/photos/libre.jpg',
        credit: { author: 'Auteur Fictif', license: 'CC0', sourceUrl: 'https://example.com/c' },
      },
    ];
    const step = PlannedRouteStep.parse({ ...plannedStep, highlights: ['Point fictif'], photos });
    expect(step).toMatchObject({ highlights: ['Point fictif'], photos });
  });

  it('reads a step planned before them as without points nor photos', () => {
    expect(PlannedRouteStep.parse(plannedStep)).toMatchObject({ highlights: [], photos: [] });
  });
});
