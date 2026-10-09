import type { MapState } from '@rnmapbox/maps';
import type { LatLng, RouteCard, RouteCluster } from '@widoo/shared';
import { motion, size, spacing } from '@widoo/tokens';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import {
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { colors } from '@widoo/tokens';
import type { Framing, MapView } from '../discovery/store';
import { isOpeningZone } from '../discovery/zone';
import { formatDuration } from '../format/duration';
import { clusterId, clusterPoints, clusterZoomStep } from './clusters';
import { bboxCenter, initialSpanM, toBbox, toLngLat, zoomForSpan, type LngLat } from './geo';
import { Mapbox } from './mapbox';
import { RecenterButton } from './MapControls';
import { sharedMarkerImages, usePhotoMarkerImages } from './markerImages';
import { routeMarkers, selectionFrame } from './markers';
import { durationLabel, labelPillImage, photoOffsetY, rimWidth } from './markerShape';
import { mapOverlayLayout, ornamentMargin } from './ornaments';
import { routeFramePadding } from './routeFrame';
import { SelectedRoute } from './SelectedRoute';
import { labelFont, mapStyleJson } from './style';
import {
  screenPointOnFit,
  tooltipAnchorX,
  tooltipSide,
  type ScreenPoint,
  type TooltipSide,
  type TooltipStep,
} from './tooltip';

/** The markers of the other routes fade out and back with a selection, `fade` (D-071). */
const markerFade = { duration: motion.durations.fade, delay: 0 };

/**
 * Camera moves take `map` (500 ms) with Mapbox easeTo, and jump with « Réduire les animations »
 * (D-030).
 */
const cameraAnimationOf = (isReducedMotion: boolean) => ({
  animationMode: isReducedMotion ? ('none' as const) : ('easeTo' as const),
  animationDuration: isReducedMotion ? 0 : motion.durations.map,
});

interface RouteMapProps {
  routes: readonly RouteCard[];
  /** Routes grouped by area, for a zone too large to list them; null otherwise. */
  clusters: readonly RouteCluster[] | null;
  /** The user's position, or Paris: where the map opens and where « recentrer » brings it. */
  center: LatLng;
  hasPosition: boolean;
  /**
   * Each time the map settles, from its opening view on: its zone and zoom, and whether the user
   * moved it (a pan or a zoom) rather than the app.
   */
  onViewChange: (view: MapView, isManual: boolean) => void;
  /**
   * A view the app asks for, such as the widened zone, a zone chosen in the search, or the opening
   * view (`home`): the camera goes there when `id` changes.
   */
  framing: Framing | null;
  selectedRoute: RouteCard | null;
  /** The card the user scrolled to in the sheet: the map comes round to its start, enlarged. */
  focusedRoute?: RouteCard | null;
  /**
   * Height the results sheet covers at the foot of the map, the floating tab bar included: the
   * focused start stays above it. Without it, the sheet at rest above the bar.
   */
  bottomInset?: number;
  /**
   * Height the bar at the top covers on the map, status bar, search pill and quick chips, as laid
   * out: the tooltip of a selected route never hangs under it. 0 without a bar or before its layout.
   */
  topInset?: number;
  /** A marker, or null for a tap elsewhere on the map. */
  onSelect: (route: RouteCard | null) => void;
  /** « Voir plus » of the tooltip: the route sheet (E-05), at the step it points at. */
  onOpenRoute: (route: RouteCard, step: TooltipStep) => void;
  /** « Rechercher dans cette zone », or the pill of a search on its way. */
  searchControl?: ReactNode;
  /** The recentre button, in every state of the map but a selection (Ecrans › E-01, D-082). */
  hasRecenter?: boolean;
  /**
   * The recentre button: the app asks for a `home` framing, and the view the map settles on is
   * searched at once (Ecrans › E-01, recentrer, D-071).
   */
  onRecenter: () => void;
}

/**
 * Map of E-01, edge to edge behind the floating tab bar: its logo, attribution and controls stay
 * above the bar. Widoo style, one photo marker per route drawn by symbol layers, the photo from an
 * image the app draws once per photo, the duration as a text of the map on a white pill; the
 * user's position as the Mapbox puck. The position never leaves the device:
 * only the zone of the map goes to the search.
 */
export function RouteMap({
  routes,
  clusters,
  center,
  hasPosition,
  onViewChange,
  framing,
  selectedRoute,
  focusedRoute = null,
  bottomInset: sheetCover,
  topInset = 0,
  onSelect,
  onOpenRoute,
  searchControl,
  hasRecenter = true,
  onRecenter,
}: RouteMapProps) {
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [startTooltip, setStartTooltip] = useState<{ anchor: number; side: TooltipSide }>({
    anchor: 0.5,
    side: 'above',
  });
  /**
   * Height of the tooltip of the start, measured once shown: the last one until the next. Kept
   * out of the state: on Android, rendering the map again during its first camera move left the
   * camera in place.
   */
  const tooltipHeight = useRef(0);
  const isReducedMotion = useReducedMotion();
  // The map runs under the floating tab bar; nothing it shows may sit behind the bar.
  const tabBarHeight = use(BottomTabBarHeightContext) ?? 0;
  /** The sheet at rest, above the tab bar. */
  const restCover = tabBarHeight + size['sheet-rest'];
  const bottomInset = sheetCover ?? restCover;
  // Mapbox lays its ornaments out in the safe area on iOS, from the edge of the view on Android.
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 0;
  const camera = useRef<ComponentRef<typeof Mapbox.Camera>>(null);
  const map = useRef<ComponentRef<typeof Mapbox.MapView>>(null);
  /** Where the camera was put once the map loaded; null before. */
  const openingCenter = useRef<LngLat | null>(null);
  /** The map has settled on its opening view. */
  const isOpened = useRef(false);
  /** A gesture of the user moved the map since it last settled. */
  const isGestureMove = useRef(false);
  const zoom = useRef(0);
  /** The last view the map settled on, told to `onViewChange`. */
  const lastView = useRef<MapView | null>(null);
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
      // The native map leaves the zone out when it fails to compute it.
      const { bounds } = state.properties as Partial<MapState['properties']>;
      if (!bounds) {
        return;
      }
      const bbox = toBbox({ ne: bounds.ne as LngLat, sw: bounds.sw as LngLat });
      // The first view is the one the map opens on, holding the centre its camera was put on,
      // never a view before it: on Android the map may still settle once on the way, at a
      // latitude of 0 (#286). Once the camera is put, a gesture of the user opens the map too.
      if (!isOpened.current) {
        const center = openingCenter.current;
        if (!center || (!isOpeningZone(bbox, center) && !isGestureMove.current)) {
          return;
        }
        isOpened.current = true;
      }
      zoom.current = state.properties.zoom;
      lastView.current = { bbox, zoom: zoom.current };
      onViewChange(lastView.current, isGestureMove.current);
      isGestureMove.current = false;
    },
    [onViewChange],
  );

  const cameraAnimation = cameraAnimationOf(isReducedMotion);

  // The Mapbox logo and attribution follow the sheet while the map shows above it; the controls
  // sit above the attribution, up to half the map.
  const { ornamentBottom, controlsBottom } = mapOverlayLayout({
    viewportHeight: viewport.height,
    topInset: insets.top,
    sheetCover: bottomInset,
    restCover,
    safeBottom,
  });

  // About 3 km across the screen (Ecrans › E-01).
  const home = {
    centerCoordinate: toLngLat(center),
    zoomLevel: zoomForSpan(center, initialSpanM, width),
  };

  /**
   * Back to the opening view. A camera already there does not move, and the map does not settle
   * again: the view it shows is told as is, so that its search still runs.
   */
  const goHome = useEffectEvent(() => {
    camera.current?.setCamera({ ...home, ...cameraAnimationOf(isReducedMotion) });
    const view = lastView.current;
    if (!view) {
      return;
    }
    const [lng, lat] = bboxCenter(view.bbox);
    const [homeLng, homeLat] = home.centerCoordinate;
    const isHome =
      Math.abs(lng - homeLng) < 1e-5 &&
      Math.abs(lat - homeLat) < 1e-5 &&
      Math.abs(view.zoom - home.zoomLevel) < 1e-2;
    if (isHome) {
      onViewChange(view, false);
    }
  });

  // A framing is followed once, when it is asked for.
  const framedId = useRef<number | null>(null);
  useEffect(() => {
    if (!framing || framedId.current === framing.id) {
      return;
    }
    framedId.current = framing.id;
    if (framing.view === 'home') {
      goHome();
      return;
    }
    camera.current?.setCamera({
      centerCoordinate: bboxCenter(framing.view.bbox),
      zoomLevel: framing.view.zoom,
      ...cameraAnimationOf(isReducedMotion),
    });
  }, [framing, isReducedMotion]);

  // The map comes round to the card the user scrolled to, gently, at the same zoom (E-04),
  // once per card; never over a selected route, which holds the camera.
  const focusedId = useRef<string | null>(null);
  useEffect(() => {
    const start = focusedRoute?.steps[0]?.location;
    if ((focusedRoute?.id ?? null) === focusedId.current) {
      return;
    }
    focusedId.current = focusedRoute?.id ?? null;
    if (!start || selectedRoute) {
      return;
    }
    camera.current?.setCamera({
      centerCoordinate: toLngLat(start),
      padding: { paddingTop: 0, paddingRight: 0, paddingBottom: bottomInset, paddingLeft: 0 },
      ...cameraAnimationOf(isReducedMotion),
    });
  }, [focusedRoute, selectedRoute, bottomInset, isReducedMotion]);

  const framePadding = (sheetCover: number) =>
    routeFramePadding({
      viewportHeight: viewport.height,
      tabBarHeight,
      sheetCover,
      topBarHeight: topInset,
      tooltipHeight: tooltipHeight.current,
    });
  /** What a framing depends on: framed again only when it changes. */
  const frameKey = (route: RouteCard, sheetCover: number) =>
    `${route.id}:${sheetCover}:${framePadding(sheetCover).top}`;

  /**
   * The route fills the lower half of the map, its tooltip the upper half under the bar at the
   * top, above the room kept for the results sheet and its step dots whole; the tooltip slides
   * sideways to stay on screen.
   */
  const frameRoute = (route: RouteCard, sheetCover: number) => {
    const frame = selectionFrame(route);
    const start = route.steps[0];
    if (!frame || !start) {
      return false;
    }
    const padding = framePadding(sheetCover);
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
    // Where the steps land once framed: the tooltip of the start slides sideways to stay on
    // screen, and passes below the start rather than cover another step (D-084).
    const points =
      'bounds' in frame
        ? route.steps.map((step) =>
            screenPointOnFit(step.location, frame.bounds, { ...viewport, padding }),
          )
        : [{ x: viewport.width / 2, y: viewport.height / 2 }];
    const [startPoint, ...others] = points;
    const anchor = tooltipAnchorX(startPoint?.x ?? viewport.width / 2, {
      screenWidth: viewport.width,
      tooltipWidth: size['tooltip-min-w'],
      margin: spacing['space-16'],
    });
    const side =
      startPoint && !route.isLocked
        ? tooltipSide(startPoint, others, {
            width: size['tooltip-min-w'],
            height: tooltipHeight.current,
            anchor,
            dotRadius: size['step-dot'] / 2,
            roomBottom: viewport.height - sheetCover,
          })
        : 'above';
    setStartTooltip({ anchor, side });
    return true;
  };

  /** Where the route was framed last, `frameKey`: framed again only on a change. */
  const framedFor = useRef('');
  const selectRoute = (route: RouteCard) => {
    if (frameRoute(route, restCover)) {
      framedFor.current = frameKey(route, restCover);
      onSelect(route);
    }
  };

  // The summary of the route in the sheet at rest is taller than the rest detent: once the sheet
  // has settled around it, the route is framed again above it, never under half the map. So too
  // once its tooltip is measured, or the bar at the top laid out again.
  const frameAgain = (route: RouteCard, bottom: number) => {
    const key = frameKey(route, bottom);
    if (bottom <= viewport.height / 2 && key !== framedFor.current) {
      framedFor.current = key;
      frameRoute(route, bottom);
    }
  };
  const reframe = useEffectEvent(frameAgain);
  useEffect(() => {
    if (selectedRoute) {
      reframe(selectedRoute, bottomInset);
    }
  }, [selectedRoute, bottomInset, topInset]);
  const handleStartTooltipHeight = (height: number) => {
    tooltipHeight.current = height;
    if (selectedRoute) {
      frameAgain(selectedRoute, bottomInset);
    }
  };

  /** Where a point of the map is on the screen, in points; the map fills its view. */
  const screenPointOf = useCallback(async (location: LngLat): Promise<ScreenPoint> => {
    const point = await map.current?.getPointInView(location);
    if (!point) {
      throw new Error('The map is not laid out yet');
    }
    return { x: point[0] ?? 0, y: point[1] ?? 0 };
  }, []);

  const routeOf = (id: unknown) => routes.find((route) => route.id === id);

  const clusterShape = useMemo(() => clusterPoints(clusters ?? []), [clusters]);
  /**
   * A tap on a cluster zooms in on it, as the user would with a gesture: « Rechercher dans cette
   * zone » then lists its routes.
   */
  const zoomOnCluster = (cluster: RouteCluster) => {
    isGestureMove.current = true;
    camera.current?.setCamera({
      centerCoordinate: toLngLat(cluster.center),
      zoomLevel: zoom.current + clusterZoomStep,
      ...cameraAnimation,
    });
  };
  const clusterOf = (id: unknown) => clusters?.find((cluster) => clusterId(cluster) === id);

  // Screen readers reach the markers and the clusters as actions of the map, in the order of
  // the results; not the markers hidden while a route is selected.
  const markerActions = [
    ...(selectedRoute ? [] : routes).map((route) => ({
      name: route.id,
      label: t('map.marker', {
        title: route.title,
        duration: formatDuration(t, route.durationMin, 'spoken'),
      }),
    })),
    ...(clusters ?? []).map((cluster) => ({
      name: clusterId(cluster),
      label: t('map.cluster', { count: cluster.count }),
    })),
  ];
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    const route = routeOf(actionName);
    const cluster = clusterOf(actionName);
    if (route) {
      selectRoute(route);
    } else if (cluster) {
      zoomOnCluster(cluster);
    }
  };
  const markerOpacity = selectedRoute ? 0 : 1;
  const clusteredCount = clusters?.reduce((count, cluster) => count + cluster.count, 0);

  return (
    <View onLayout={(event) => setViewport(event.nativeEvent.layout)} className="flex-1 bg-surface">
      <Mapbox.MapView
        ref={map}
        style={{ flex: 1 }}
        styleJSON={mapStyleJson}
        compassEnabled={false}
        scaleBarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        logoPosition={{ bottom: ornamentBottom, left: ornamentMargin }}
        attributionPosition={{ bottom: ornamentBottom, right: ornamentMargin }}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleMapIdle}
        // Android drops the latitude of the default camera when it loads a style given as JSON
        // (rnmapbox/maps#4273): the map is put back at its opening place once loaded, on both
        // systems, and opens once it has settled there.
        onDidFinishLoadingMap={() => {
          openingCenter.current = home.centerCoordinate;
          camera.current?.setCamera({ ...home, animationMode: 'none', animationDuration: 0 });
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
            // The other markers are hidden while a route is selected: a tap there is a tap
            // elsewhere on the map (D-071).
            if (selectedRoute) {
              onSelect(null);
              return;
            }
            const route = routeOf(event.features[0]?.properties?.routeId);
            if (route) {
              selectRoute(route);
            }
          }}
        >
          {/*
            The selected route gives way to its tooltip and its steps; the other markers fade out
            while it is selected, so as not to cover its path, and back after (D-071).
          */}
          <Mapbox.SymbolLayer
            id="route-marker-photos"
            filter={['!=', ['get', 'routeId'], selectedRoute?.id ?? '']}
            style={{
              iconImage: ['get', 'image'],
              // The marker of the focused card is drawn at its active size.
              iconSize: [
                'case',
                ['==', ['get', 'routeId'], focusedRoute?.id ?? ''],
                size['marker-active'] / size.marker,
                1,
              ],
              iconAnchor: 'bottom',
              iconOffset: [0, photoOffsetY(label.pillHeight)],
              iconAllowOverlap: true,
              iconOpacity: markerOpacity,
              iconOpacityTransition: markerFade,
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
              iconOpacity: markerOpacity,
              iconOpacityTransition: markerFade,
              textOpacity: markerOpacity,
              textOpacityTransition: markerFade,
              symbolZOrder: 'viewport-y',
            }}
          />
        </Mapbox.ShapeSource>
        <Mapbox.ShapeSource
          id="route-clusters"
          shape={clusterShape}
          onPress={(event) => {
            const cluster = clusterOf(event.features[0]?.properties?.clusterId);
            if (cluster) {
              zoomOnCluster(cluster);
            }
          }}
        >
          {/* A blue disc with a white rim, as the markers; blue is 3:1 at least on the map. */}
          <Mapbox.CircleLayer
            id="route-cluster-discs"
            style={{
              circleRadius: ['get', 'radius'],
              circleColor: colors.blue,
              circleStrokeColor: colors.bg,
              circleStrokeWidth: rimWidth,
            }}
          />
          {/* The count in number-s, capped at 1.3 as the duration labels. */}
          <Mapbox.SymbolLayer
            id="route-cluster-counts"
            style={{
              textField: ['get', 'label'],
              textFont: labelFont,
              textSize: label.textSize,
              textColor: colors['on-blue'],
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />
        </Mapbox.ShapeSource>
        {selectedRoute && (
          <SelectedRoute
            key={selectedRoute.id}
            route={selectedRoute}
            tooltipAnchor={startTooltip.anchor}
            tooltipSide={startTooltip.side}
            roomBottom={viewport.height - bottomInset}
            screenPointOf={screenPointOf}
            onOpen={(step) => onOpenRoute(selectedRoute, step)}
            onClose={() => onSelect(null)}
            onStartTooltipHeight={handleStartTooltipHeight}
          />
        )}
      </Mapbox.MapView>
      <View
        accessible
        accessibilityLabel={
          clusteredCount === undefined
            ? t('map.label', { count: routes.length })
            : t('map.clustersLabel', { count: clusteredCount })
        }
        accessibilityActions={markerActions}
        onAccessibilityAction={handleAccessibilityAction}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {controlsBottom !== null && (
        <View
          pointerEvents="box-none"
          className="flex-row items-end gap-8 px-16"
          // Height of the sheet measured at runtime.
          style={[styles.controls, { bottom: controlsBottom }]}
        >
          <View pointerEvents="box-none" className="flex-1 items-center">
            {searchControl}
          </View>
          {/* Hidden while a route is selected (Ecrans › E-04). */}
          {hasRecenter && !selectedRoute && <RecenterButton onPress={onRecenter} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', left: 0, right: 0 },
});
