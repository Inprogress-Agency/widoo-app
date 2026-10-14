import * as React from 'react';
import Svg, { Defs, ClipPath, Circle, G, Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
interface Props extends SvgProps {
  /** Width and height, in points. */
  size: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
}
const SvgFlagFr = ({ size, ...props }: Props) => (
  <Svg fill="none" viewBox="0 0 28 28" width={size} height={size} {...props}>
    <Defs>
      <ClipPath id="flag-fr-clip">
        <Circle cx={14} cy={14} r={14} />
      </ClipPath>
    </Defs>
    <G clipPath="url(#flag-fr-clip)">
      <Path fill="#FFF" d="M0 0h28v28H0z" />
      <Path fill="#002395" d="M0 0h9.34v28H0z" />
      <Path fill="#ED2939" d="M18.66 0H28v28h-9.34z" />
    </G>
    <Circle cx={14} cy={14} r={13.5} stroke={props.color} strokeOpacity={0.12} />
  </Svg>
);
export default SvgFlagFr;
