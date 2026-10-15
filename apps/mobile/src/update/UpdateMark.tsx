import { firstLaunch } from '@widoo/tokens';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const [gradientStart, gradientEnd] = firstLaunch.logo.stroke.gradient;

/** The square of the source logo (design/design-system/logo-widoo.svg), its side in the viewBox. */
export const LOGO_SIDE = 1096;
/** Room above and below the square: the branches of the W leave it. */
const OVERFLOW = 560;
/** Width of the stroke of the source file. */
const STROKE_WIDTH = 126.013;
/** Lowest point of the W, its stroke included, from the top of the square. */
export const MARK_BOTTOM_RATIO = 965 / LOGO_SIDE;

/**
 * The W of the logo, without its square (E-20): stroke and gradient of the source file, drawn
 * over a box taller than the square so that the branches go out of the screen, never clipped.
 * Decorative.
 */
export function UpdateMark({ side }: { side: number }) {
  const height = (side * (LOGO_SIDE + 2 * OVERFLOW)) / LOGO_SIDE;
  return (
    <Svg
      width={side}
      height={height}
      viewBox={`0 ${-OVERFLOW} ${LOGO_SIDE} ${LOGO_SIDE + 2 * OVERFLOW}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient
          id="update-mark"
          x1="345.36"
          y1="-22.5572"
          x2="816.634"
          y2="877.213"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={gradientStart} />
          <Stop offset="1" stopColor={gradientEnd} />
        </LinearGradient>
      </Defs>
      <Path
        d="M624.341 738.761C660.438 647.374 662.832 544.725 645.686 506.543C614.234 436.502 541.807 423.722 488.533 449.649C435.259 475.576 405.056 548.941 442.491 611.175C460.896 641.772 538.154 701.274 624.341 738.761ZM624.341 738.761C594.223 815.009 540.644 883.421 455.375 900.011C267.907 936.486 180.6 632.547 -33.7121 517.802C-248.024 403.057 -570.941 489.243 -570.941 489.243M624.341 738.761C702.351 763.965 797.079 763.197 864.079 707.907C1011.38 586.348 832.203 325.778 879.812 87.3891C927.421 -151 1249.13 -462.318 1249.13 -462.318"
        fill="none"
        stroke="url(#update-mark)"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}
