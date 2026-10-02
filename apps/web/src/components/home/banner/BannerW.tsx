'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The line of the W of the logo (wiki › design-system/logo-widoo.svg), in its own coordinates, as
 * its three strokes, all starting from the knot in the middle: drawn together, the part of the W
 * inside the banner shows from the start, the ends cut by its edges come last.
 */
const wStrokes = [
  'M624.341 738.761C660.438 647.374 662.832 544.725 645.686 506.543C614.234 436.502 541.807 423.722 488.533 449.649C435.259 475.576 405.056 548.941 442.491 611.175C460.896 641.772 538.154 701.274 624.341 738.761Z',
  'M624.341 738.761C594.223 815.009 540.644 883.421 455.375 900.011C267.907 936.486 180.6 632.547 -33.7121 517.802C-248.024 403.057 -570.941 489.243 -570.941 489.243',
  'M624.341 738.761C702.351 763.965 797.079 763.197 864.079 707.907C1011.38 586.348 832.203 325.778 879.812 87.3891C927.421 -151 1249.13 -462.318 1249.13 -462.318',
];

/** Frame of the W in each layout, copied from the source of the mockups (E-21). */
const frames = [
  {
    viewBox: '-257.9 238.5 1179.8 1676.2',
    width: 366,
    height: 520,
    turn: 16,
    className: 'md:hidden',
  },
  {
    viewBox: '-946.5 174.4 1793.5 1096.0',
    width: 720,
    height: 440,
    turn: 24,
    className: 'hidden md:block xl:hidden',
  },
  {
    viewBox: '-1352.9 157.5 2383.8 787.8',
    width: 1392,
    height: 460,
    turn: 24,
    className: 'hidden xl:block',
  },
] as const;

/**
 * The W of the logo, turned, behind the text of the final banner (E-21), decorative: its line
 * light, with its shadow, held in the top left corner on the phone, the top right one from the
 * tablet, cut by the edges of the banner. It draws itself once, in 1.2 s, when half of the banner
 * is in view (E-21 › Mouvement). Drawn at once when the banner is already in view on load, with
 * « Réduire les animations » or without JavaScript.
 */
export function BannerW() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'drawn' | 'waiting' | 'drawing'>('drawn');

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setState('waiting');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setState('drawing');
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="absolute left-0 top-0 md:left-auto md:right-0">
      {frames.map((frame) => {
        const key = `banner-w-${frame.width}`;
        return (
          <svg
            key={frame.width}
            viewBox={frame.viewBox}
            width={frame.width}
            height={frame.height}
            className={`block ${frame.className}`}
          >
            <defs>
              <linearGradient
                id={`${key}-light`}
                x1="345.36"
                y1="-22.5572"
                x2="816.634"
                y2="877.213"
                gradientUnits="userSpaceOnUse"
              >
                <stop className="stop-w-light-start" />
                <stop offset="1" className="stop-w-light-end" />
              </linearGradient>
              <filter
                id={`${key}-shadow`}
                x="-651"
                y="-543"
                width="1999"
                height="1544"
                filterUnits="userSpaceOnUse"
              >
                <feDropShadow dx="8.69" dy="8.69" stdDeviation="13.04" floodOpacity="0.12" />
              </filter>
            </defs>
            <g transform={`rotate(${frame.turn} 548 548)`} filter={`url(#${key}-shadow)`}>
              {wStrokes.map((stroke) => (
                <path
                  key={stroke.slice(0, 24)}
                  d={stroke}
                  fill="none"
                  stroke={`url(#${key}-light)`}
                  strokeWidth="126.013"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={state === 'waiting' ? 1 : undefined}
                  className={state === 'drawing' ? 'animate-w-draw' : undefined}
                />
              ))}
            </g>
          </svg>
        );
      })}
    </div>
  );
}
