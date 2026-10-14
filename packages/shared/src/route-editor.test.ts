import { describe, expect, it } from 'vitest';
import { ChangeRouteStatus, CreateRoute, PutRouteSteps, StepInput, UpdateRoute } from '.';

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
  ])('refuses %s', (_, body) => {
    expect(UpdateRoute.safeParse(body).success).toBe(false);
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
  ])('refuses %s', (_, fields) => {
    expect(StepInput.safeParse({ placeId, durationMin: 45, ...fields }).success).toBe(false);
  });
});

describe('PutRouteSteps', () => {
  it('saves more than ten steps, which only the submission blocks', () => {
    const steps = Array.from({ length: 12 }, () => ({ placeId, durationMin: 30 }));
    expect(PutRouteSteps.safeParse({ steps }).success).toBe(true);
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
