import type { RouteCard } from '@widoo/shared';
import { colors, motion, size, spacing } from '@widoo/tokens';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { LockedStartDot, StepDot } from '../ui/StepDot';
import { Mapbox } from './mapbox';
import type { LngLat } from './geo';
import { routePath, routeStops, type Stop } from './markers';
import { RouteTooltip } from './RouteTooltip';
import { stepLine } from './stepLine';
import { tooltipAnchorX, type TooltipStep } from './tooltip';

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

interface StepPinProps {
  stop: Stop & { category: NonNullable<Stop['category']> };
  label: string;
  isActive: boolean;
  onTap: () => void;
}

/**
 * A step dot of the selected route, in a touch target of 44 points: a tap opens its tooltip and
 * draws it at its active size (Ecrans › E-04).
 */
function StepPin({ stop, label, isActive, onTap }: StepPinProps) {
  return (
    <Pressable
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      className="size-touch-min items-center justify-center"
    >
      <Animated.View entering={stopFade}>
        <StepDot category={stop.category} isActive={isActive} />
      </Animated.View>
    </Pressable>
  );
}

/** The step the user tapped, from 0, and where its tooltip hangs from it. */
interface TappedStep {
  index: number;
  anchor: number;
}

interface SelectedRouteProps {
  route: RouteCard;
  /** Where the tooltip hangs from the start, from 0 (left edge) to 1 (right edge). */
  tooltipAnchor: number;
  /**
   * Horizontal position of a point on the screen, from the map: a view on the map cannot measure
   * itself there.
   */
  screenXOf: (location: LngLat) => Promise<number>;
  /** « Voir plus », with the step the tooltip points at, from 1, and whether it was tapped. */
  onOpen: (step: TooltipStep) => void;
  onClose: () => void;
  /** Height of the tooltip of the start as laid out; that of a tapped step is not told. */
  onStartTooltipHeight?: (height: number) => void;
}

/**
 * The selected route on the map (Ecrans › E-04): blue path, step dots by family and one tooltip,
 * on the start until the user taps a step, all fading in. Each tap moves the tooltip to its step,
 * which fades in there anew (M-07), and draws that step at 34 points, the others at 28; the route
 * stays selected. A locked card keeps only its start, as the ink dot with the crown, not tappable.
 * The dots of this one route are views on the map, never those of every route. Mounted again
 * for each route, so that each selection fades in anew.
 */
export function SelectedRoute({
  route,
  tooltipAnchor,
  screenXOf,
  onOpen,
  onClose,
  onStartTooltipHeight,
}: SelectedRouteProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isFadedIn = useIsFadedIn();
  const [tapped, setTapped] = useState<TappedStep | null>(null);
  const path = routePath(route);
  const stops = routeStops(route);
  const tooltipIndex = tapped?.index ?? 0;
  const tooltipStop = stops[tooltipIndex];

  const tapStep = async (index: number, location: LngLat) => {
    // Centred on the step when the map cannot tell where it is.
    const screenX = await screenXOf(location).catch(() => width / 2);
    setTapped({
      index,
      // The tooltip slides sideways to stay on screen, as over the start.
      anchor: tooltipAnchorX(screenX, {
        screenWidth: width,
        tooltipWidth: size['tooltip-min-w'],
        margin: spacing['space-16'],
      }),
    });
  };

  const renderStop = (stop: Stop, index: number) => {
    const step = route.steps[index];
    const category = stop.category;
    return (
      // Shown over the user's position too: a step next to the user stays on the map.
      <Mapbox.MarkerView
        key={stop.key}
        coordinate={stop.location}
        allowOverlap
        allowOverlapWithPuck
      >
        {category && step ? (
          <StepPin
            stop={{ ...stop, category }}
            label={stepLine(t, step, index + 1, route.stepCount).dotLabel}
            isActive={tapped?.index === index}
            onTap={() => void tapStep(index, stop.location)}
          />
        ) : (
          <Animated.View entering={stopFade} pointerEvents="none">
            <LockedStartDot />
          </Animated.View>
        )}
      </Mapbox.MarkerView>
    );
  };

  // The start is drawn last, above the other steps.
  const drawOrder = stops.map((_, index) => index).slice(1);
  if (stops.length > 0) {
    drawOrder.push(0);
  }

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
      {drawOrder.map((index) => {
        const stop = stops[index];
        return stop ? renderStop(stop, index) : null;
      })}
      {tooltipStop && (
        <Mapbox.MarkerView
          // Mounted again on each step, so that the tooltip fades in from its new anchor (M-07).
          key={`tooltip-${tooltipIndex}`}
          coordinate={tooltipStop.location}
          anchor={{ x: tapped?.anchor ?? tooltipAnchor, y: 1 }}
          allowOverlap
          allowOverlapWithPuck
        >
          <RouteTooltip
            route={route}
            isLocked={route.isLocked}
            position={tooltipIndex + 1}
            arrowAt={tapped?.anchor ?? tooltipAnchor}
            onOpen={() => onOpen({ position: tooltipIndex + 1, isTapped: tapped !== null })}
            onClose={onClose}
            onHeightChange={tapped ? undefined : onStartTooltipHeight}
          />
        </Mapbox.MarkerView>
      )}
    </>
  );
}
