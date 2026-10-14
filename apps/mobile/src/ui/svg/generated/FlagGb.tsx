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
const SvgFlagGb = ({ size, ...props }: Props) => (
  <Svg fill="none" viewBox="0 0 28 28" width={size} height={size} {...props}>
    <Defs>
      <ClipPath id="flag-gb-clip">
        <Circle cx={14} cy={14} r={14} />
      </ClipPath>
    </Defs>
    <G clipPath="url(#flag-gb-clip)">
      <Path fill="#012169" d="M0 0h28v28H0z" />
      <Path stroke="#FFF" strokeWidth={5.6} d="m0 0 28 28m0-28L0 28" />
      <Path stroke="#C8102E" strokeWidth={1.9} d="m0 0 28 28m0-28L0 28" />
      <Path stroke="#FFF" strokeWidth={9.3} d="M14 0v28M0 14h28" />
      <Path stroke="#C8102E" strokeWidth={5.6} d="M14 0v28M0 14h28" />
    </G>
    <Circle cx={14} cy={14} r={13.5} stroke={props.color} strokeOpacity={0.12} />
  </Svg>
);
export default SvgFlagGb;
