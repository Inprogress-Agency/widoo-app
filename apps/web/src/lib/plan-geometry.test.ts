import { describe, expect, it } from 'vitest';
import { placeOnScreen, progressAt, roundedPath } from './plan-geometry';

describe('roundedPath', () => {
  it('rounds each turn with the given radius', () => {
    expect(
      roundedPath(
        [
          { x: 0, y: 100 },
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        20,
      ),
    ).toBe('M0 100 L0 20 Q0 0 20 0 L100 0');
  });

  it('turns exactly on the point of a step, rounds the other turns', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: -100 },
    ];
    expect(roundedPath(points, 20, new Set([1]))).toBe(
      'M0 100 L0 0 L80 0 Q100 0 100 -20 L100 -100',
    );
  });

  it('shortens the radius on a short segment', () => {
    expect(
      roundedPath(
        [
          { x: 0, y: 10 },
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        20,
      ),
    ).toBe('M0 10 L0 5 Q0 0 5 0 L100 0');
  });

  it('draws a straight line between two points, a point alone as a move', () => {
    expect(
      roundedPath(
        [
          { x: 0, y: 0 },
          { x: 10, y: 5 },
        ],
        20,
      ),
    ).toBe('M0 0 L10 5');
    expect(roundedPath([{ x: 3, y: 4 }], 20)).toBe('M3 4');
    expect(roundedPath([], 20)).toBe('');
  });
});

describe('progressAt', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 0, y: 30 },
    { x: 0, y: 100 },
  ];

  it('measures the share of the line drawn when it reaches a point', () => {
    expect(progressAt(points, 0)).toBe(0);
    expect(progressAt(points, 1)).toBe(0.3);
    expect(progressAt(points, 2)).toBe(1);
  });
});

describe('placeOnScreen', () => {
  it('turns the point like the streets, then moves it', () => {
    expect(placeOnScreen({ x: 100, y: 0 }, 90, { x: 10, y: 20 })).toEqual({ x: 10, y: 120 });
    expect(placeOnScreen({ x: 100, y: 0 }, 0, { x: 10, y: 20 })).toEqual({ x: 110, y: 20 });
  });

  it('matches the SVG rotate() transform, clockwise on the screen', () => {
    const { x, y } = placeOnScreen({ x: 100, y: 0 }, -12, { x: 0, y: 0 });
    expect(x).toBeCloseTo(97.8, 1);
    expect(y).toBeCloseTo(-20.8, 1);
  });
});
