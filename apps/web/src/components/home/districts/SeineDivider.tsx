/** The river and its two islands, drawn at the size of the mockups (phone, then tablet). */
const drawings = {
  phone: {
    width: 354,
    river: 'M -10 40 C 70 18 140 20 190 30 C 250 42 300 22 364 34',
    stroke: 24,
    islands: [
      { cx: 176, cy: 29, rx: 22, ry: 5 },
      { cx: 214, cy: 33, rx: 12, ry: 4 },
    ],
    // Across the plan, to its edges (6 px of padding on each side).
    className: '-mx-6 md:hidden',
  },
  tablet: {
    width: 720,
    river: 'M -10 40 C 140 14 280 22 380 30 C 500 42 600 20 730 34',
    stroke: 26,
    islands: [
      { cx: 366, cy: 29, rx: 30, ry: 6 },
      { cx: 420, cy: 33, rx: 16, ry: 4 },
    ],
    className: 'hidden -ml-12 w-seine-tablet md:grid xl:hidden',
  },
} as const;

/**
 * The Seine between the two banks on the phone and the tablet (E-21 › Quartiers), decorative,
 * copied from the source of the mockups. The river stretches across the whole plan at any width,
 * its line keeping its thickness; the islands keep their shape, in the middle.
 */
export function SeineDivider() {
  return (
    <>
      {Object.values(drawings).map((drawing) => (
        <div key={drawing.width} aria-hidden className={`grid ${drawing.className}`}>
          <svg
            width="100%"
            height="64"
            viewBox={`0 0 ${drawing.width} 64`}
            preserveAspectRatio="none"
            className="col-start-1 row-start-1 block"
          >
            <path
              d={drawing.river}
              fill="none"
              strokeWidth={drawing.stroke}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-map-water"
            />
          </svg>
          <svg
            width={drawing.width}
            height="64"
            viewBox={`0 0 ${drawing.width} 64`}
            className="col-start-1 row-start-1 block justify-self-center"
          >
            {drawing.islands.map((island) => (
              <ellipse key={island.cx} {...island} className="fill-district-map" />
            ))}
          </svg>
        </div>
      ))}
    </>
  );
}
