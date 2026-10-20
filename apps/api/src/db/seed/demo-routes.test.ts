import { budgetBucketOf, taxonomies } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import { bucketsOf, orchestrationOf, placesOfRoute } from './demo-orchestration';
import { assumedZeros, budgetOf, demoDataset, paris, type DemoRoute } from './demo-routes';

const { places, routes } = demoDataset;
const indoorShare = (route: DemoRoute) =>
  placesOfRoute(route).filter((place) => place.isIndoor).length / route.steps.length;

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

    const { computed, transitions } = orchestrationOf(route);

    it('lasts the steps plus their estimated trips, under 40 % of the total', () => {
      const travel = computed.durationMin - stepMinutes;
      const trips = transitions.reduce((sum, trip) => sum + (trip?.durationMin ?? 0), 0);
      expect(travel).toBe(trips);
      expect(travel / computed.durationMin).toBeLessThanOrEqual(0.4);
    });

    it('carries the budget as the sum of its step costs, and its bucket from that sum', () => {
      expect(computed.budgetPerPersonEur).toBe(budgetOf(route));
      expect(bucketsOf(route).budgetBucket).toBe(budgetBucketOf(budgetOf(route)));
    });

    it('rates the effort from the walking distance', () => {
      const { walkingM: walking, distanceM: distance, effort } = computed;
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
      transports: routes.map((route) => orchestrationOf(route).computed.transport),
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

// Criterion of #538: recomputed by the engine, the ten routes keep the buckets, transport and
// effort they had when entered by hand, and break only the rules listed here.
describe('demo dataset recomputed by the engine', () => {
  const kept: Record<string, [string, string, string, string]> = {
    'marais-a-l-abri': ['half_day', 'low', 'walk', 'easy'],
    'montmartre-a-deux': ['half_day', 'medium', 'walk', 'easy'],
    'canal-saint-martin-a-velo': ['half_day', 'low', 'bike', 'easy'],
    'butte-aux-cailles-village': ['half_day', 'low', 'walk', 'easy'],
    'belleville-street-art': ['1_2h', 'free', 'walk', 'easy'],
    'jardin-des-plantes-en-famille': ['full_day', 'medium', 'walk', 'easy'],
    'de-la-cite-a-montparnasse': ['full_day', 'medium', 'metro', 'easy'],
    'buttes-chaumont-guignol': ['half_day', 'low', 'walk', 'easy'],
    'marais-gourmand': ['1_2h', 'medium', 'walk', 'easy'],
    'coulee-verte-bois-de-vincennes': ['full_day', 'free', 'walk', 'intense'],
  };
  // The Guignol plays on Wednesdays and weekends, the dataset date is a Friday; the garden
  // route comes back to the Ménagerie; the Coulée verte walks long stretches.
  const warned: Record<string, [string, number | null][]> = {
    'jardin-des-plantes-en-famille': [['back_and_forth', null]],
    'buttes-chaumont-guignol': [['closed_at_arrival', 0]],
    'coulee-verte-bois-de-vincennes': [
      ['transition_too_long', 1],
      ['transition_too_long', 2],
    ],
  };

  it.each(routes.map((route) => [route.key, route] as const))('%s', (key, route) => {
    const { computed, result } = orchestrationOf(route);
    const { durationBucket, budgetBucket, transport, effort } = computed;
    expect([durationBucket, budgetBucket, transport, effort]).toEqual(kept[key]);
    expect(result.warnings.map((issue) => [issue.code, issue.stepPosition])).toEqual(
      warned[key] ?? [],
    );
    // The seed has no photo of a place, and a photo on a few steps only.
    const withoutPhoto = route.steps.flatMap((step, position) =>
      step.photos.length > 0 ? [] : [['missing_step_photo', position]],
    );
    expect(result.errors.map((issue) => [issue.code, issue.stepPosition])).toEqual(withoutPhoto);
    for (const condition of computed.conditions) expect(route.conditions).toContain(condition);
    expect(computed.startTime).toBe(route.suggestedStart ?? computed.startTime);
    expect(computed.startComputed).toBe(route.suggestedStart === undefined);
  });

  it('keeps the trip mode the creator chose, and proposes the others (D-048)', () => {
    for (const route of routes) {
      const { transitions } = orchestrationOf(route);
      route.steps.slice(0, -1).forEach((step, position) => {
        if (step.transitionMode) expect(transitions[position]?.mode).toBe(step.transitionMode);
      });
      expect(transitions.at(-1)).toBeNull();
    }
  });
});
