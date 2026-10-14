import type { CoherenceRuleCode } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import {
  defaultCoherenceThresholds,
  evaluateRoute,
  type EvaluatedRoute,
  type EvaluatedStep,
} from './evaluate';

const now = new Date('2026-10-14T08:00:00.000Z');
const walk = (durationMin: number, distanceM = durationMin * 75) => ({
  distanceM,
  durationMin,
  mode: 'walk' as const,
});

const step = (placeId: string, fields: Partial<EvaluatedStep> = {}): EvaluatedStep => ({
  placeId,
  durationMin: 60,
  costPerPersonEur: 10,
  transition: walk(10),
  hasPhoto: true,
  ...fields,
});

/** A route that breaks no rule: three steps of an hour, ten minutes apart on foot. */
const valid: EvaluatedRoute = {
  title: 'Le Marais gourmand',
  description: 'Une boucle tranquille entre cafés, fromagers et cours pavées du Marais. '.repeat(2),
  hasPhoto: true,
  steps: [step('a'), step('b'), step('c', { transition: null, costPerPersonEur: null })],
};

const codes = (issues: { code: CoherenceRuleCode; stepPosition: number | null }[]) =>
  issues.map((issue) => [issue.code, issue.stepPosition]);

describe('evaluateRoute', () => {
  it('computes the aggregates on the estimated trips, and breaks no rule', () => {
    expect(evaluateRoute(valid, now)).toEqual({
      computed: {
        durationMin: 200,
        budgetPerPersonEur: 20,
        distanceM: 1500,
        walkingM: 1500,
        effort: 'easy',
        computedAt: '2026-10-14T08:00:00.000Z',
      },
      warnings: [],
      errors: [],
    });
  });

  it('computes nothing without a step, and blocks it', () => {
    const result = evaluateRoute({ ...valid, steps: [] }, now);
    expect(result.computed).toBeNull();
    expect(codes(result.errors)).toEqual([['min_steps', null]]);
  });

  it('counts walking only on foot, and the effort from it', () => {
    const metro = { distanceM: 9000, durationMin: 35, mode: 'metro' as const };
    const steps = [step('a', { transition: walk(50, 4000) }), step('b', { transition: metro })];
    const result = evaluateRoute(
      { ...valid, steps: [...steps, step('c', { transition: null })] },
      now,
    );
    expect(result.computed).toMatchObject({
      distanceM: 13_000,
      walkingM: 4000,
      effort: 'moderate',
    });
    const far = [step('a', { transition: walk(55, 7000) }), step('b', { transition: null })];
    expect(evaluateRoute({ ...valid, steps: far }, now).computed?.effort).toBe('intense');
  });

  it.each<[string, Partial<EvaluatedRoute>, [CoherenceRuleCode, number | null][]]>([
    ['an untitled route', { title: null }, [['missing_title', null]]],
    ['a single step', { steps: [step('a', { transition: null })] }, [['min_steps', null]]],
    [
      'eleven steps',
      { steps: Array.from({ length: 11 }, (_, i) => step(`p${i}`, { transition: null })) },
      [['max_steps', null]],
    ],
    [
      'a step of 5 minutes and one of 7 hours',
      { steps: [step('a', { durationMin: 5 }), step('b', { durationMin: 420, transition: null })] },
      [
        ['step_has_duration', 0],
        ['step_has_duration', 1],
      ],
    ],
    [
      'a walk of more than an hour',
      { steps: [step('a', { transition: walk(61) }), step('b', { transition: null })] },
      [['transition_too_long', 0]],
    ],
    [
      'a route over 14 hours',
      {
        steps: Array.from({ length: 3 }, (_, i) =>
          step(`p${i}`, { durationMin: 300, transition: null }),
        ),
      },
      [['total_too_long', null]],
    ],
    [
      'a step without photo, of its own or of its place',
      { steps: [step('a'), step('b', { hasPhoto: false, transition: null })] },
      [['missing_step_photo', 1]],
    ],
    [
      'a description under 80 characters',
      { description: 'Trop court.' },
      [['missing_description', null]],
    ],
    ['no description', { description: null }, [['missing_description', null]]],
    ['a route without photo', { hasPhoto: false }, [['missing_photo', null]]],
  ])('blocks %s', (_, fields, expected) => {
    const result = evaluateRoute({ ...valid, ...fields }, now);
    expect(codes(result.errors)).toEqual(expected);
    expect(result.warnings).toEqual([]);
  });

  it.each<[string, EvaluatedStep[], [CoherenceRuleCode, number | null][]]>([
    [
      'a walk over 30 minutes, under its double',
      [step('a', { transition: walk(31) }), step('b', { transition: null })],
      [['transition_too_long', 0]],
    ],
    [
      'a metro trip over 45 minutes, under its double',
      [
        step('a', { transition: { distanceM: 12_000, durationMin: 46, mode: 'metro' } }),
        step('b', { durationMin: 120, transition: null }),
      ],
      [['transition_too_long', 0]],
    ],
    [
      'more than 40 % of the time travelling',
      [
        step('a', { durationMin: 15, transition: walk(25) }),
        step('b', { durationMin: 15, transition: null }),
      ],
      [['too_many_transitions', null]],
    ],
    [
      'the same place twice',
      [step('a'), step('b'), step('a', { transition: null })],
      [['duplicate_place', 2]],
    ],
  ])('warns of %s without blocking', (_, steps, expected) => {
    const result = evaluateRoute({ ...valid, steps }, now);
    expect(codes(result.warnings)).toEqual(expected);
    expect(result.errors).toEqual([]);
  });

  it('applies the thresholds it is given', () => {
    const strict = { ...defaultCoherenceThresholds, minSteps: 4 };
    expect(codes(evaluateRoute(valid, now, strict).errors)).toEqual([['min_steps', null]]);
  });
});
