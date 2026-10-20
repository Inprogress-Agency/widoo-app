import { describe, expect, it } from 'vitest';
import {
  ChangeRouteStatus,
  CreateRoute,
  PutRouteSteps,
  RouteEvaluation,
  StepInput,
  UpdateRoute,
} from '.';

const placeId = '01997a4e-8c00-7000-8000-000000000001';
const stepId = '01997a4e-8c00-7000-8000-000000000002';

describe('UpdateRoute', () => {
  it('keeps the moods in the order given, the first one being the main one', () => {
    expect(UpdateRoute.parse({ moods: ['food', 'culture'] }).moods).toEqual(['food', 'culture']);
  });

  it.each([
    ['a title over 60 characters', { title: 'x'.repeat(61) }],
    ['a mood twice', { moods: ['food', 'food'] }],
    ['the derived condition no_booking', { conditions: ['no_booking'] }],
    ['markup in the description', { description: '<script>' }],
    ['an unknown field', { access: 'premium' }],
    ['a start with seconds', { suggestedStart: '10:00:00' }],
    ['a fourth tip', { tips: ['a', 'b', 'c', 'd'] }],
    ['a tip over 80 characters', { tips: ['x'.repeat(81)] }],
    ['an empty tip', { tips: [' '] }],
    ['a hidden suggestion twice', { tipsHidden: ['comfy_shoes', 'comfy_shoes'] }],
    ['a hidden suggestion that is no key', { tipsHidden: ['Chaussures confortables'] }],
    ['the getting there removed by D-050', { gettingThere: 'Métro Abbesses' }],
  ])('refuses %s', (_, body) => {
    expect(UpdateRoute.safeParse(body).success).toBe(false);
  });

  it('takes the suggested start, the tips and the hidden suggestions (D-048, D-050)', () => {
    const body = {
      suggestedStart: '10:30',
      tips: [' Des espèces ', 'Une gourde'],
      tipsHidden: ['comfy_shoes'],
    };
    expect(UpdateRoute.parse(body)).toEqual({ ...body, tips: ['Des espèces', 'Une gourde'] });
    expect(UpdateRoute.parse({ suggestedStart: null, tips: [] })).toEqual({
      suggestedStart: null,
      tips: [],
    });
  });

  it('creates an untitled draft, or a titled one', () => {
    expect(CreateRoute.parse({})).toEqual({});
    expect(CreateRoute.parse({ title: ' Le Marais ' })).toEqual({ title: 'Le Marais' });
  });
});

describe('StepInput', () => {
  it('fills the optional fields of a new step with null', () => {
    expect(StepInput.parse({ placeId, durationMin: 45 })).toEqual({
      placeId,
      title: null,
      description: null,
      highlights: null,
      durationMin: 45,
      costPerPersonEur: null,
      bookingRequired: false,
      bookingUrl: null,
      bookingProvider: null,
      bookingNote: null,
      bookingIsAffiliate: false,
      endsOn: null,
      transitionNote: null,
      transitionMode: null,
    });
  });

  it.each([
    ['a word over 600 characters', { description: 'x'.repeat(601) }],
    ['a fourth highlight', { highlights: ['a', 'b', 'c', 'd'] }],
    ['a booking link in http', { bookingUrl: 'http://example.com' }],
    ['a path over 200 characters', { transitionNote: 'x'.repeat(201) }],
    ['no duration', { durationMin: undefined }],
    ['a booking note over 80 characters', { bookingNote: 'x'.repeat(81) }],
    ['an end that is no date', { endsOn: '17/01/2027' }],
  ])('refuses %s', (_, fields) => {
    expect(StepInput.safeParse({ placeId, durationMin: 45, ...fields }).success).toBe(false);
  });
});

describe('PutRouteSteps', () => {
  it('saves more than ten steps, which only the submission blocks', () => {
    const steps = Array.from({ length: 12 }, () => ({ placeId, durationMin: 30 }));
    expect(PutRouteSteps.safeParse({ steps }).success).toBe(true);
  });

  it('refuses an affiliate link without its booking link (D-048)', () => {
    const step = { placeId, durationMin: 30, bookingRequired: true, bookingIsAffiliate: true };
    expect(PutRouteSteps.safeParse({ steps: [step] }).success).toBe(false);
    const linked = { ...step, bookingUrl: 'https://example.com/book', bookingNote: 'Le soir' };
    expect(PutRouteSteps.safeParse({ steps: [linked] }).success).toBe(true);
  });

  it('refuses the same step id twice', () => {
    const step = { id: stepId, placeId, durationMin: 30 };
    expect(PutRouteSteps.safeParse({ steps: [step, step] }).success).toBe(false);
  });
});

describe('ChangeRouteStatus', () => {
  it('lets the author set private, draft or unpublished only', () => {
    expect(ChangeRouteStatus.safeParse({ status: 'private' }).success).toBe(true);
    expect(ChangeRouteStatus.safeParse({ status: 'published' }).success).toBe(false);
  });
});

describe('RouteEvaluation', () => {
  const evaluation = {
    computed: {
      durationMin: 165,
      budgetPerPersonEur: 12.5,
      distanceM: 1200,
      walkingM: 1200,
      effort: 'easy',
      durationBucket: '1_2h',
      budgetBucket: 'low',
      conditions: ['no_booking', 'indoor'],
      transport: 'walk',
      startTime: '14:00',
      startComputed: true,
      computedAt: '2026-10-20T08:00:00.000Z',
    },
    warnings: [{ code: 'closed_at_arrival', stepPosition: 1 }],
    errors: [],
    proposedStart: '14:30',
    proposedOrder: null,
  };

  it('carries the start, the buckets and what the engine proposes (D-049, D-050)', () => {
    expect(RouteEvaluation.parse(evaluation)).toEqual(evaluation);
    const reorder = { ...evaluation, proposedStart: null, proposedOrder: [0, 2, 1] };
    expect(RouteEvaluation.parse(reorder).proposedOrder).toEqual([0, 2, 1]);
  });

  it.each([
    ['a start with seconds', { ...evaluation, proposedStart: '14:30:00' }],
    ['a negative position', { ...evaluation, proposedOrder: [0, -1] }],
    ['no proposal at all', { ...evaluation, proposedStart: undefined }],
    [
      'a computed start out of the day',
      { ...evaluation, computed: { ...evaluation.computed, startTime: '25:00' } },
    ],
  ])('refuses %s', (_, body) => {
    expect(RouteEvaluation.safeParse(body).success).toBe(false);
  });
});
