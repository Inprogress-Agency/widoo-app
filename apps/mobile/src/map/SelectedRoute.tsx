import type { RouteCard } from '@widoo/shared';
import { colors, motion, size, spacing } from '@widoo/tokens';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { LockedStartDot, StepDot } from '../ui/StepDot';
import { Mapbox } from './mapbox';
import type { LngLat } from './geo';
import { routePath, routeStops, type Stop } from './markers';
import { RouteTooltip } from './RouteTooltip';
import { stepLine } from './stepLine';
import { nearestStep } from './stepTouch';
import { tooltipAnchorX, type ScreenPoint, type TooltipStep } from './tooltip';

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
  /** Where the finger touched, from the top left corner of the touch target. */
  onTap: (touch: ScreenPoint) => void;
}

/**
 * A step dot of the selected route, in a touch target of 44 points: a tap opens the tooltip of the
 * step closest to the finger and draws it at its active size (Ecrans › E-04). The dot lets the
 * touch through, so that it is measured from the target.
 */
function StepPin({ stop, label, isActive, onTap }: StepPinProps) {
  return (
    <Pressable
      onPress={(event: GestureResponderEvent) =>
        onTap({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY })
      }
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      className="size-touch-min items-center justify-center"
    >
      <Animated.View entering={stopFade} pointerEvents="none">
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
   * Position of a point on the screen, from the map: a view on the map cannot measure itself
   * there.
   */
  screenPointOf: (location: LngLat) => Promise<ScreenPoint>;
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
 * stays selected. Close steps stay apart (D-084): a tap goes to the step closest to the finger.
 * A locked card keeps only its start, as the ink dot with the crown, not tappable. The dots of
 * this one route are views on the map, never those of every route. Mounted again for each
 * route, so that each selection fades in anew.
 */
export function SelectedRoute({
  route,
  tooltipAnchor,
  screenPointOf,
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

  /** A tap on the dot of step `index`, the finger at `touch` in its touch target. */
  const tapStep = async (index: number, touch: ScreenPoint) => {
    const points = await Promise.all(
      stops.map((stop) => screenPointOf(stop.location).catch(() => null)),
    );
    const touched = points[index];
    const target = size['touch-min'];
    const finger = touched && {
      x: touched.x + touch.x - target / 2,
      y: touched.y + touch.y - target / 2,
    };
    // The map cannot tell where a step is: the step tapped, its tooltip centred above it.
    const known = points.flatMap((point, at) => (point ? [{ point, at }] : []));
    const closest = finger
      ? nearestStep(
          finger,
          known.map(({ point }) => point),
        )
      : null;
    const chosen = closest === null ? index : (known[closest]?.at ?? index);
    const point = points[chosen];
    if (!point) {
      setTapped({ index, anchor: 0.5 });
      return;
    }
    // The tooltip slides sideways to stay on screen, as over the start.
    const anchor = tooltipAnchorX(point.x, {
      screenWidth: width,
      tooltipWidth: size['tooltip-min-w'],
      margin: spacing['space-16'],
    });
    setTapped({ index: chosen, anchor });
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
            onTap={(touch) => void tapStep(index, touch)}
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
