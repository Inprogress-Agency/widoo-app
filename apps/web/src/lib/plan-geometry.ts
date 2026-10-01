export type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const round = (value: number) => Math.round(value * 10) / 10;
const toward = (from: Point, to: Point, length: number): Point => {
  const total = distance(from, to);
  if (total === 0) return from;
  return {
    x: from.x + ((to.x - from.x) * length) / total,
    y: from.y + ((to.y - from.y) * length) / total,
  };
};
const write = (p: Point) => `${round(p.x)} ${round(p.y)}`;

/**
 * SVG path through points, each turn rounded with the given radius (shortened when a segment is
 * too short), like the line of the logo drawn along the streets (E-21). The turns listed in
 * `exact` (indexes of `points`) turn on the point itself: a step sits there, its pin centred on
 * the crossing and on the line, and hides the turn.
 */
export function roundedPath(
  points: readonly Point[],
  radius: number,
  exact: ReadonlySet<number> = new Set(),
): string {
  const [start, ...rest] = points;
  if (!start) return '';
  const end = rest.at(-1);
  if (!end) return `M${write(start)}`;

  const commands = [`M${write(start)}`];
  let previous = start;
  for (const [index, corner] of rest.slice(0, -1).entries()) {
    const next = rest[index + 1] ?? end;
    if (exact.has(index + 1)) {
      commands.push(`L${write(corner)}`);
      previous = corner;
      continue;
    }
    const r = Math.min(radius, distance(previous, corner) / 2, distance(corner, next) / 2);
    commands.push(`L${write(toward(corner, previous, r))}`);
    commands.push(`Q${write(corner)} ${write(toward(corner, next, r))}`);
    previous = corner;
  }
  commands.push(`L${write(end)}`);
  return commands.join(' ');
}

/**
 * Share of the line drawn when it reaches the point at `index`, from 0 to 1, measured along the
 * straight segments: close enough to the rounded path to time the steps of the animation.
 */
export function progressAt(points: readonly Point[], index: number): number {
  let total = 0;
  let reached = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    total += distance(a, b);
    if (i === index) reached = total;
  }
  return total === 0 ? 0 : Math.round(((index === 0 ? 0 : reached) / total) * 1000) / 1000;
}

/** A point of the plan, turned like the streets then moved: where it lands on the screen. */
export function placeOnScreen(point: Point, angleDegrees: number, offset: Point): Point {
  const angle = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: round(offset.x + point.x * cos - point.y * sin),
    y: round(offset.y + point.x * sin + point.y * cos),
  };
}
