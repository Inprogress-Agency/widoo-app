type Props = {
  /** Distance between two streets: across the columns, then across the rows. */
  street: { column: number; row: number };
  /** Wider streets: indexes of the columns and rows of the grid. */
  avenues: { columns: readonly number[]; rows: readonly number[] };
  /** Number of streets drawn on each side of the origin: enough to cover the frame. */
  reach?: number;
};

/**
 * Streets of the blue plan (E-21): thin pale lines, a few wider ones like avenues (6 and 14 px,
 * measured on the mockup). Drawn around the origin of the grid, in the same space as the route, so that the line
 * of the route runs on the streets. Decorative.
 */
export function PlanStreets({ street, avenues, reach = 12 }: Props) {
  const length = Math.max(street.column, street.row) * reach;
  const indexes = Array.from({ length: reach * 2 + 1 }, (_, i) => i - reach);
  const width = (index: number, wide: readonly number[]) => (wide.includes(index) ? 14 : 6);

  return (
    // Opaque lines, then the transparency on the whole group: where two streets cross, the
    // crossing keeps the tint of the streets instead of adding two transparent layers (E-21).
    <g className="stroke-bg opacity-10">
      {indexes.map((index) => (
        <line
          key={`column-${index}`}
          x1={index * street.column}
          x2={index * street.column}
          y1={-length}
          y2={length}
          strokeWidth={width(index, avenues.columns)}
        />
      ))}
      {indexes.map((index) => (
        <line
          key={`row-${index}`}
          x1={-length}
          x2={length}
          y1={index * street.row}
          y2={index * street.row}
          strokeWidth={width(index, avenues.rows)}
        />
      ))}
    </g>
  );
}
