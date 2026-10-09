import * as React from 'react';
import Svg, { G, Circle, Path, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
interface Props extends SvgProps {
  /** Width and height, in points. */
  size: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
}
const SvgAvatarWidoo = ({ size, ...props }: Props) => (
  <Svg fill="none" viewBox="0 0 1096 1096" width={size} height={size} {...props}>
    <G clipPath="url(#avatar-widoo-clip)">
      <Circle cx={548} cy={548} r={548} fill={props.color} />
      <Path
        stroke="url(#avatar-widoo-w)"
        strokeLinecap="round"
        strokeWidth={126.013}
        d="M624.341 738.761c36.097-91.387 38.491-194.036 21.345-232.218-31.452-70.041-103.879-82.821-157.153-56.894s-83.477 99.292-46.042 161.526c18.405 30.597 95.663 90.099 181.85 127.586Zm0 0c-30.118 76.248-83.697 144.66-168.966 161.25C267.907 936.486 180.6 632.547-33.712 517.802s-537.229-28.559-537.229-28.559M624.341 738.761c78.01 25.204 172.738 24.436 239.738-30.854 147.301-121.559-31.876-382.129 15.733-620.518s369.318-549.707 369.318-549.707"
      />
    </G>
    <Defs>
      <LinearGradient
        id="avatar-widoo-w"
        x1={345.36}
        x2={816.634}
        y1={-22.557}
        y2={877.213}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={props.gradientFrom} />
        <Stop offset={1} stopColor={props.gradientTo} />
      </LinearGradient>
      <ClipPath id="avatar-widoo-clip">
        <Circle cx={548} cy={548} r={548} />
      </ClipPath>
    </Defs>
  </Svg>
);
export default SvgAvatarWidoo;
