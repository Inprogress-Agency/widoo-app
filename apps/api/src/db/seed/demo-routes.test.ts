import { taxonomies } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import {
  assumedZeros,
  bucketsOf,
  budgetOf,
  demoDataset,
  paris,
  type DemoRoute,
} from './demo-routes';

const { places, routes } = demoDataset;
const placeOf = new Map(places.map((place) => [place.key, place]));
const stepPlaces = (route: DemoRoute) =>
  route.steps.map((step) => {
    const place = placeOf.get(step.place);
    if (!place) throw new Error(`Unknown place ${step.place}`);
    return place;
  });
const indoorShare = (route: DemoRoute) =>
  stepPlaces(route).filter((place) => place.isIndoor).length / route.steps.length;

describe('demo dataset', () => {
  it('holds ten routes of three to six steps, on places inside Paris', () => {
    expect(routes).toHaveLength(10);
    for (const route of routes) {
      expect(route.steps.length).toBeGreaterThanOrEqual(3);
      expect(route.steps.length).toBeLessThanOrEqual(6);
    }
    const { west, south, east, north } = paris.bounds;
    for (const { location } of places) {
      expect(location.lng).toBeGreaterThan(west);
      expect(location.lng).toBeLessThan(east);
      expect(location.lat).toBeGreaterThan(south);
      expect(location.lat).toBeLessThan(north);
    }
  });

  it('goes through the neighbourhoods named by the ticket', () => {
    const neighborhoods = new Set(places.map((place) => place.addressComponents.neighborhood));
    for (const name of [
      'Le Marais',
      'Montmartre',
      'Canal Saint-Martin',
      'Butte-aux-Cailles',
      'Belleville',
    ]) {
      expect(neighborhoods).toContain(name);
    }
  });

  describe.each(routes.map((route) => [route.key, route] as const))('%s', (_, route) => {
    const stepMinutes = route.steps.reduce((sum, step) => sum + step.durationMin, 0);

    it('lasts the steps plus transitions under 40 % of the total', () => {
      const travel = route.computed.duration_min - stepMinutes;
      expect(travel).toBeGreaterThanOrEqual(0);
      expect(travel / route.computed.duration_min).toBeLessThanOrEqual(0.4);
    });

    it('shows the budget as the step costs ± 20 %', () => {
      const budget = budgetOf(route);
      expect(route.computed.budget_per_person_eur).toEqual({
        min: Math.floor(budget * 0.8),
        max: Math.ceil(budget * 1.2),
      });
    });

    it('rates the effort from the walking distance', () => {
      const { walking_m: walking, distance_m: distance, effort } = route.computed;
      expect(walking).toBeLessThanOrEqual(distance);
      expect(effort).toBe(walking < 3000 ? 'easy' : walking < 7000 ? 'moderate' : 'intense');
    });

    it('states conditions consistent with its steps', () => {
      const has = (condition: (typeof taxonomies.conditions)[number]) =>
        route.conditions.includes(condition);
      const isBooked = route.steps.some((step) => step.bookingRequired);
      expect(has('no_booking')).toBe(!isBooked);
      expect(has('indoor')).toBe(indoorShare(route) > 0.5);
      expect(has('outdoor')).toBe(indoorShare(route) < 0.5);
      if (has('rainy')) expect(indoorShare(route)).toBeGreaterThan(0.5);
      if (has('sunny')) expect(indoorShare(route)).toBeLessThan(0.5);
      for (const step of route.steps.filter((step) => step.bookingRequired)) {
        expect(step.bookingProvider).toBeDefined();
      }
    });
  });

  // Criterion of #32: every value of the Filtres page returns a route, or is an assumed zero.
  describe('covers every filter value, except the assumed zeros', () => {
    const covered = {
      audiences: routes.flatMap((route) => route.audiences),
      moods: routes.flatMap((route) => route.moods),
      conditions: routes.flatMap((route) => route.conditions),
      transports: routes.map((route) => route.transport),
      durations: routes.map((route) => bucketsOf(route).durationBucket),
      budgets: routes.map((route) => bucketsOf(route).budgetBucket),
    };
    const zerosOf: Partial<Record<keyof typeof covered, readonly string[]>> = assumedZeros;

    it.each(Object.keys(covered) as (keyof typeof covered)[])('%s', (group) => {
      const values: readonly string[] = covered[group];
      const zeros = zerosOf[group] ?? [];
      for (const value of taxonomies[group]) {
        expect(values.includes(value), `${group} ${value}`).toBe(!zeros.includes(value));
      }
    });
  });
});
