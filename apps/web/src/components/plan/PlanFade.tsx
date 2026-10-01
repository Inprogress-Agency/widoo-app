/** Where the streets of a plan fade out (E-21): on the left on the computer, at the top below. */
export type PlanFadeSide = 'left' | 'top';

/**
 * Mask that fades out the streets of a plan, to use as `mask="url(#<id>)"` inside the same
 * `<svg>`. A luminance mask: black hides, white shows. On the left, from 40 % to 56 % of the width
 * (under the card); at the top, over 40 px (under the text).
 */
export function PlanFade({ id, side }: { id: string; side: PlanFadeSide }) {
  return (
    <defs>
      <linearGradient
        id={`${id}-gradient`}
        gradientUnits="userSpaceOnUse"
        {...(side === 'left'
          ? { x1: '40%', x2: '56%', y1: '0', y2: '0' }
          : { x1: '0', x2: '0', y1: '0', y2: '40' })}
      >
        <stop offset="0" stopColor="black" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
        <rect width="100%" height="100%" fill={`url(#${id}-gradient)`} />
      </mask>
    </defs>
  );
}
