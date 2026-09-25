import type { MapState } from '@rnmapbox/maps';
import type { LatLng, RouteCard } from '@widoo/shared';
import { motion, size, spacing } from '@widoo/tokens';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { colors } from '@widoo/tokens';
import type { MapView } from '../discovery/store';
import { formatDuration } from '../format/duration';
import { bboxCenter, initialSpanM, toBbox, toLngLat, zoomForSpan, type LngLat } from './geo';
import { Mapbox } from './mapbox';
import { RecenterButton } from './MapControls';
import { sharedMarkerImages, usePhotoMarkerImages } from './markerImages';
import { isLocked, routeMarkers, selectionFrame } from './markers';
import { durationLabel, labelPillImage, photoOffsetY } from './markerShape';
import { SelectedRoute } from './SelectedRoute';
import { labelFont, mapStyleJson } from './style';
import { screenXOnFit, tooltipAnchorX } from './tooltip';

/**
 * Camera moves take `map` (500 ms) with Mapbox easeTo, and jump with « Réduire les animations »
 * (D-030).
 */
const cameraAnimationOf = (isReducedMotion: boolean) => ({
  animationMode: isReducedMotion ? ('none' as const) : ('easeTo' as const),
  animationDuration: isReducedMotion ? 0 : motion.durations.map,
});

/** Map ornaments (Mapbox logo and attribution, required) sit in the margin of the screen. */
const ornamentMargin = { bottom: spacing['space-8'], left: spacing['space-8'] };

interface RouteMapProps {
  routes: readonly RouteCard[];
  /** The user's position, or Paris: where the map opens and where « recentrer » brings it. */
  center: LatLng;
  hasPosition: boolean;
  /**
   * Each time the map settles, from its opening view on: its zone and zoom, and whether the user
   * moved it (a pan or a zoom) rather than the app.
   */
  onViewChange: (view: MapView, isManual: boolean) => void;
  /** A view the app asks for, such as the widened zone: the camera goes there when `id` changes. */
  framing: { id: number; view: MapView } | null;
  selectedRoute: RouteCard | null;
  /** A Premium route is locked for a user without subscription (D-014). */
  hasPremium: boolean;
  /** A marker, or null for a tap elsewhere on the map. */
  onSelect: (route: RouteCard | null) => void;
  /** « Voir plus » of the tooltip: the route sheet (E-05). */
  onOpenRoute: (route: RouteCard) => void;
  /** Line left of the recentre button, such as the location off banner. */
  banner?: ReactNode;
  /** « Rechercher dans cette zone », or the pill of a search on its way, above the banner. */
  searchControl?: ReactNode;
}

/**
 * Map of E-01: Widoo style, one photo marker per route drawn by symbol layers, the photo from an
 * image the app draws once per photo, the duration as a text of the map on a white pill; the
 * user's position as the Mapbox puck. The position never leaves the device:
 * only the zone of the map goes to the search.
 */
export function RouteMap({
  routes,
  center,
  hasPosition,
  onViewChange,
  framing,
  selectedRoute,
  hasPremium,
  onSelect,
  onOpenRoute,
  banner,
  searchControl,
}: RouteMapProps) {
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [tooltipAnchor, setTooltipAnchor] = useState(0.5);
  const isReducedMotion = useReducedMotion();
  const camera = useRef<ComponentRef<typeof Mapbox.Camera>>(null);
  const isHome = useRef(false);
  /** A gesture of the user moved the map since it last settled. */
  const isGestureMove = useRef(false);
  const label = durationLabel(fontScale);
  const sharedImages = useMemo(() => sharedMarkerImages(label.pillHeight), [label.pillHeight]);
  const photoImages = usePhotoMarkerImages(routes);
  const markers = useMemo(
    () =>
      routeMarkers(routes, {
        isDrawn: (image) => image in photoImages,
        durationOf: (route) => formatDuration(t, route.durationMin, 'short'),
      }),
    [routes, photoImages, t],
  );

  const handleCameraChanged = useCallback((state: MapState) => {
    if (state.gestures.isGestureActive) {
      isGestureMove.current = true;
    }
  }, []);

  const handleMapIdle = useCallback(
    (state: MapState) => {
      // The first view is the one the map opens on, never the view before it.
      if (!isHome.current) {
        return;
      }
      const { bounds, zoom } = state.properties;
      const bbox = toBbox({ ne: bounds.ne as LngLat, sw: bounds.sw as LngLat });
      onViewChange({ bbox, zoom }, isGestureMove.current);
      isGestureMove.current = false;
    },
    [onViewChange],
  );

  const cameraAnimation = cameraAnimationOf(isReducedMotion);

  // About 3 km across the screen (Ecrans › E-01).
  const home = {
    centerCoordinate: toLngLat(center),
    zoomLevel: zoomForSpan(center, initialSpanM, width),
  };

  // A framing is followed once, when it is asked for.
  const framedId = useRef<number | null>(null);
  useEffect(() => {
    if (!framing || framedId.current === framing.id) {
      return;
    }
    framedId.current = framing.id;
    camera.current?.setCamera({
      centerCoordinate: bboxCenter(framing.view.bbox),
      zoomLevel: framing.view.zoom,
      ...cameraAnimationOf(isReducedMotion),
    });
  }, [framing, isReducedMotion]);

  const recenter = () => {
    camera.current?.setCamera({ ...home, ...cameraAnimation });
  };

  /**
   * The route fills the lower half of the map, its tooltip the upper half, above the room kept
   * for the results sheet; the tooltip slides sideways to stay on screen.
   */
  const selectRoute = (route: RouteCard) => {
    const frame = selectionFrame(route, isLocked(route, hasPremium));
    const start = route.steps[0];
    if (!frame || !start) {
      return;
    }
    const padding = {
      top: viewport.height / 2,
      right: spacing['space-32'],
      bottom: size['sheet-rest'],
      left: spacing['space-32'],
    };
    camera.current?.setCamera({
      ...('bounds' in frame ? { bounds: frame.bounds } : { centerCoordinate: frame.center }),
      padding: {
        paddingTop: padding.top,
        paddingRight: padding.right,
        paddingBottom: padding.bottom,
        paddingLeft: padding.left,
      },
      ...cameraAnimation,
    });
    const startX =
      'bounds' in frame
        ? screenXOnFit(start.location, frame.bounds, { ...viewport, padding })
        : viewport.width / 2;
    setTooltipAnchor(
      tooltipAnchorX(startX, {
        screenWidth: viewport.width,
        tooltipWidth: size['tooltip-w'],
        margin: spacing['space-16'],
      }),
    );
    onSelect(route);
  };

  const routeOf = (id: unknown) => routes.find((route) => route.id === id);

  // Screen readers reach the markers as actions of the map, in the order of the results.
  const markerActions = routes.map((route) => ({
    name: route.id,
    label: t('map.marker', {
      title: route.title,
      duration: formatDuration(t, route.durationMin, 'spoken'),
    }),
  }));
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const route = routeOf(event.nativeEvent.actionName);
    if (route) {
      selectRoute(route);
    }
  };

  return (
    <View onLayout={(event) => setViewport(event.nativeEvent.layout)} className="flex-1 bg-surface">
      <Mapbox.MapView
        style={{ flex: 1 }}
        styleJSON={mapStyleJson}
        compassEnabled={false}
        scaleBarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        logoPosition={ornamentMargin}
        attributionPosition={{ ...ornamentMargin, left: undefined, right: spacing['space-8'] }}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleMapIdle}
        // Android drops the default camera when it loads a style given as JSON: the map is put
        // back at its opening place once loaded, on both systems.
        onDidFinishLoadingMap={() => {
          camera.current?.setCamera({ ...home, animationMode: 'none', animationDuration: 0 });
          isHome.current = true;
        }}
        onPress={() => onSelect(null)}
      >
        <Mapbox.Camera ref={camera} defaultSettings={home} />
        {hasPosition && <Mapbox.LocationPuck visible />}
        <Mapbox.Images images={{ ...sharedImages, ...photoImages }} />
        <Mapbox.ShapeSource
          id="route-markers"
          shape={markers}
          onPress={(event) => {
            const route = routeOf(event.features[0]?.properties?.routeId);
            if (route) {
              selectRoute(route);
            }
          }}
        >
          {/* The selected route gives way to its tooltip and its steps. */}
          <Mapbox.SymbolLayer
            id="route-marker-photos"
            filter={['!=', ['get', 'routeId'], selectedRoute?.id ?? '']}
            style={{
              iconImage: ['get', 'image'],
              iconAnchor: 'bottom',
              iconOffset: [0, photoOffsetY(label.pillHeight)],
              iconAllowOverlap: true,
              symbolZOrder: 'viewport-y',
            }}
          />
          {/*
            The duration, over the photos: number-s times the system text setting capped at 1.3,
            as maxFontSizeMultiplier does not reach a text of the map. The map serves its own
            fonts: Plus Jakarta Sans would have to be uploaded to the Mapbox account.
          */}
          <Mapbox.SymbolLayer
            id="route-marker-durations"
            filter={['!=', ['get', 'routeId'], selectedRoute?.id ?? '']}
            style={{
              textField: ['get', 'duration'],
              textFont: labelFont,
              textSize: label.textSize,
              textColor: colors.ink,
              textAnchor: 'center',
              textOffset: [0, label.textOffsetY],
              textAllowOverlap: true,
              iconImage: labelPillImage,
              iconAnchor: 'bottom',
              iconTextFit: 'width',
              iconTextFitPadding: [0, label.paddingX, 0, label.paddingX],
              iconAllowOverlap: true,
              symbolZOrder: 'viewport-y',
            }}
          />
        </Mapbox.ShapeSource>
        {selectedRoute && (
          <SelectedRoute
            key={selectedRoute.id}
            route={selectedRoute}
            isLocked={isLocked(selectedRoute, hasPremium)}
            tooltipAnchor={tooltipAnchor}
            onOpen={() => onOpenRoute(selectedRoute)}
            onClose={() => onSelect(null)}
          />
        )}
      </Mapbox.MapView>
      <View
        accessible
        accessibilityLabel={t('map.label', { count: routes.length })}
        accessibilityActions={markerActions}
        onAccessibilityAction={handleAccessibilityAction}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="box-none"
        className="flex-row items-end gap-8 px-16 pb-32"
        style={styles.controls}
      >
        <View pointerEvents="box-none" className="flex-1 gap-8">
          {searchControl && (
            <View pointerEvents="box-none" className="items-center">
              {searchControl}
            </View>
          )}
          {banner}
        </View>
        {/* Hidden while a route is selected (Ecrans › E-04). */}
        {!selectedRoute && <RecenterButton onPress={recenter} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
