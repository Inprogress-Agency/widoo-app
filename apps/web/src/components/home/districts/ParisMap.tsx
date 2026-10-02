/** Streets of the plan: every 92 px across, every 112 px down, one in three or four wider. */
const across = Array.from({ length: 18 }, (_, index) => ({
  at: -400 + index * 92,
  wide: index % 3 === 1,
}));
const down = Array.from({ length: 24 }, (_, index) => ({
  at: -600 + index * 112,
  wide: index % 4 === 2,
}));

/**
 * Light plan of Paris behind the districts on the computer (E-21 › Quartiers), decorative: streets
 * tilted like the blue plan, three parks, the Seine and its two islands. Drawn at the size of the
 * plan of the mockups (1184 × 640), copied from their source.
 */
export function ParisMap() {
  return (
    <svg
      aria-hidden
      width="1184"
      height="640"
      viewBox="0 0 1184 640"
      className="absolute hidden xl:block"
    >
      <rect width="1184" height="640" className="fill-district-map" />
      <g transform="rotate(-13 592 320)" strokeLinecap="round" className="stroke-bg">
        {across.map(({ at, wide }) => (
          <line key={`a${at}`} x1="-600" y1={at} x2="2000" y2={at} strokeWidth={wide ? 12 : 5} />
        ))}
        {down.map(({ at, wide }) => (
          <line key={`d${at}`} x1={at} y1="-600" x2={at} y2="1400" strokeWidth={wide ? 12 : 5} />
        ))}
      </g>
      <g className="fill-district-park">
        <path d="M 1010 150 C 1050 120 1130 128 1140 176 C 1150 220 1100 250 1056 238 C 1010 226 990 176 1010 150 Z" />
        <rect x="300" y="364" width="200" height="54" rx="10" />
        <path d="M 520 600 C 560 568 660 572 680 612 L 690 700 L 510 700 Z" />
      </g>
      <path
        d="M -60 560 C 250 520 450 430 700 452 C 950 474 1100 430 1260 520"
        fill="none"
        strokeWidth="56"
        strokeLinecap="round"
        className="stroke-map-water"
      />
      <ellipse
        cx="700"
        cy="452"
        rx="46"
        ry="11"
        transform="rotate(4 700 452)"
        className="fill-district-map"
      />
      <ellipse cx="790" cy="460" rx="28" ry="8" className="fill-district-map" />
    </svg>
  );
}
