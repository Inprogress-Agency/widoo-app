import type { RouteCard } from '@widoo/shared';
import { colors, motion, spacing } from '@widoo/tokens';
import { useEffect, useState } from 'react';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { LockedStartDot, StepDot } from '../ui/StepDot';
import { Mapbox } from './mapbox';
import { routePath, routeStops } from './markers';
import { RouteTooltip } from './RouteTooltip';

const fadeTransition = { duration: motion.durations.fade, delay: 0 };
// A fade, kept with « Réduire les animations » (D-030).
const stopFade = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

/** True from the frame after the first render: the path then fades in from zero (M-07). */
function useIsFadedIn(): boolean {
  const [isFadedIn, setIsFadedIn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsFadedIn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isFadedIn;
}

interface SelectedRouteProps {
  route: RouteCard;
  isLocked: boolean;
  /** Where the tooltip hangs from the start, from 0 (left edge) to 1 (right edge). */
  tooltipAnchor: number;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * The selected route on the map (Ecrans › E-04): blue path, step dots by family and the tooltip
 * on the start, all fading in. Locked, only the start remains, as the ink dot with the crown.
 * The dots of this one route are views on the map, never those of every route. Mounted again
 * for each route, so that each selection fades in anew.
 */
export function SelectedRoute({
  route,
  isLocked,
  tooltipAnchor,
  onOpen,
  onClose,
}: SelectedRouteProps) {
  const isFadedIn = useIsFadedIn();
  const path = isLocked ? null : routePath(route);
  const [start, ...others] = routeStops(route, isLocked);
  return (
    <>
      {path && (
        <Mapbox.ShapeSource id="selected-path" shape={path}>
          <Mapbox.LineLayer
            id="selected-path"
            style={{
              lineColor: colors.blue,
              // tokens.json has no stroke width yet: the spacing scale stands in, as for icons.
              lineWidth: spacing['space-4'],
              lineCap: 'round',
              lineJoin: 'round',
              lineOpacity: isFadedIn ? 1 : 0,
              lineOpacityTransition: fadeTransition,
            }}
          />
        </Mapbox.ShapeSource>
      )}
      {[...others, start].flatMap((stop) =>
        stop ? (
          <Mapbox.MarkerView key={stop.key} coordinate={stop.location} allowOverlap>
            <Animated.View entering={stopFade} pointerEvents="none">
              {stop.category ? <StepDot category={stop.category} /> : <LockedStartDot />}
            </Animated.View>
          </Mapbox.MarkerView>
        ) : (
          []
        ),
      )}
      {start && (
        <Mapbox.MarkerView
          coordinate={start.location}
          anchor={{ x: tooltipAnchor, y: 1 }}
          allowOverlap
          allowOverlapWithPuck
        >
          <RouteTooltip
            route={route}
            isLocked={isLocked}
            arrowAt={tooltipAnchor}
            onOpen={onOpen}
            onClose={onClose}
          />
        </Mapbox.MarkerView>
      )}
    </>
  );
}
