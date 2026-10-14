import { describe, expect, it } from 'vitest';
import { PlannedRouteStep, Step, StepHighlights, stepHighlightsMax } from '.';

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
