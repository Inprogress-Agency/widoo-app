import type { Point } from '@/lib/plan-geometry';
import type { PlaceCategory } from '@widoo/shared';

export type PlanStep = {
  /** Index of the step in `points`. */
  point: number;
  time: string;
  name: string;
  /** Shorter name for the phone (E-21: « Musée »). */
  shortName?: string;
  category: PlaceCategory;
  /** Side of the pin where its name is written… */
  side: 'left' | 'right';
  /** …and on the phone, when it differs, so that the name stays in the frame. */
  phoneSide?: 'left' | 'right';
  /** Step of a Premium route: its category in place of its name, with a lock (E-21). */
  locked?: boolean;
};

export type PlanWalk = {
  minutes: number;
  /** On the line, between the two steps. */
  at: Point;
  /** Index, in `steps`, of the step it leaves. */
  after: number;
};

/**
 * A route drawn on the streets of a plan. Coordinates in pixels, in the grid of the streets before
 * it is turned: every segment of the line follows a street, every turn is a crossing.
 */
export type Plan = {
  /** Distance between two streets: across the columns, then across the rows. */
  street: { column: number; row: number };
  /** Turn of the whole grid on the screen, in degrees. */
  angle: number;
  /** Wider streets, like avenues: indexes of the columns and rows of the grid. */
  avenues: { columns: readonly number[]; rows: readonly number[] };
  /** Radius of the turns of the line. */
  turn: number;
  /** Indexes, in `points`, of the turns kept sharp besides those under a step. */
  sharpTurns?: readonly number[];
  points: readonly Point[];
  steps: readonly PlanStep[];
  walks: readonly PlanWalk[];
};

/**
 * Example route of the blue plan (E-21 › Hero): « Montmartre sans les touristes », drawn after the
 * mockups: every step and every walking time on a crossing. An illustration, not a route of the catalogue: the steps of a shared route are never
 * shown. Names of places, the same in every language.
 */
export const examplePlan: Plan = {
  // Measured on the mockup of the computer (1440 px): streets every 126 px across, every 102 px
  // down, turned by 12°.
  street: { column: 126, row: 102 },
  angle: -12,
  avenues: { columns: [-4, -1, 3], rows: [-3, 0, 3] },
  turn: 36,
  // Up 1, right 1, up 2, right 1 to the museum; up 1, right 2 to the café; down 2, left 1,
  // down 1 to the restaurant. In pixels: column × 126, row × 102.
  points: [
    { x: -252, y: 204 },
    { x: -252, y: 102 },
    { x: -126, y: 102 },
    { x: -126, y: -102 },
    { x: 0, y: -102 },
    { x: 0, y: -204 },
    { x: 252, y: -204 },
    { x: 252, y: 0 },
    { x: 126, y: 0 },
    { x: 126, y: 102 },
  ],
  steps: [
    {
      point: 0,
      time: '10:00',
      name: 'Place des Abbesses',
      shortName: 'Abbesses',
      category: 'walk',
      side: 'right',
    },
    {
      point: 4,
      time: '10:35',
      name: 'Musée de Montmartre',
      shortName: 'Musée',
      category: 'museum',
      side: 'left',
      phoneSide: 'right',
    },
    {
      point: 6,
      time: '13:25',
      name: 'Café Lomi',
      category: 'cafe',
      side: 'right',
      phoneSide: 'left',
    },
    { point: 9, time: '14:30', name: 'Le Consulat', category: 'restaurant', side: 'left' },
  ],
  walks: [
    { minutes: 15, at: { x: -126, y: 0 }, after: 0 },
    { minutes: 20, at: { x: 126, y: -204 }, after: 1 },
    { minutes: 20, at: { x: 252, y: -102 }, after: 2 },
  ],
};

/** The example route of the hero, on its sticker (E-21): « Montmartre sans les touristes ». */
export const exampleRoute = {
  title: 'Montmartre sans les touristes',
  durationMin: 420,
  stepCount: examplePlan.steps.length,
} as const;

/**
 * The plan of a Premium route (E-21): the steps after the start show only their category and a
 * lock, as in the sheet of the app; the start keeps its name.
 */
export function lockPlan(plan: Plan, categoryLabels: Record<PlaceCategory, string>): Plan {
  return {
    ...plan,
    steps: plan.steps.map((step, index) =>
      index === 0
        ? step
        : { ...step, name: categoryLabels[step.category], shortName: undefined, locked: true },
    ),
  };
}

/**
 * The plan of the missing page (E-21, D-074): the example route stops halfway, above the museum:
 * it turns right at the next crossing and stops 27 px further, where a question mark stands
 * (measured on the mockup of the computer). Only the start keeps its pin, without label; the turn
 * of the museum stays sharp, as on the mockup.
 */
export const unfinishedPlan: Plan = {
  ...examplePlan,
  points: [...examplePlan.points.slice(0, 6), { x: 27, y: -204 }],
  steps: examplePlan.steps.slice(0, 1),
  walks: [],
  sharpTurns: [4],
};
