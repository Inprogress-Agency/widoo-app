import type { MapState } from '@rnmapbox/maps';
import type { LatLng, RouteCard } from '@widoo/shared';
import { motion, spacing } from '@widoo/tokens';
import { useCallback, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { formatDuration } from '../format/duration';
import { MapMarker } from '../ui/MapMarker';
import { initialSpanM, toBbox, toLngLat, zoomForSpan, type Bbox, type LngLat } from './geo';
import { Mapbox } from './mapbox';
import { MapImage } from './MapImage';
import { RecenterButton } from './MapControls';
import { markerImage, routeMarkers } from './markers';
import { mapStyleJson } from './style';

/** Map ornaments (Mapbox logo and attribution, required) sit in the margin of the screen. */
const ornamentMargin = { bottom: spacing['space-8'], left: spacing['space-8'] };

interface RouteMapProps {
  routes: readonly RouteCard[];
  /** The user's position, or Paris: where the map opens and where « recentrer » brings it. */
  center: LatLng;
  hasPosition: boolean;
  /** Called once, when the first view of the map settles: its zone feeds the first search. */
  onFirstZone: (zone: Bbox) => void;
  onRoutePress: (route: RouteCard) => void;
  /** Line left of the recentre button, such as the location off banner. */
  banner?: ReactNode;
}

/**
 * Map of E-01: Widoo style, one photo marker per route drawn by a symbol layer from images made
 * once per route, the user's position as the Mapbox puck. The position never leaves the device:
 * only the zone of the map goes to the search.
 */
export function RouteMap({
  routes,
  center,
  hasPosition,
  onFirstZone,
  onRoutePress,
  banner,
}: RouteMapProps) {
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const camera = useRef<ComponentRef<typeof Mapbox.Camera>>(null);
  const hasZone = useRef(false);
  const isHome = useRef(false);

  const handleMapIdle = useCallback(
    (state: MapState) => {
      // The first zone is the one the map opens on, never the view before it.
      if (hasZone.current || !isHome.current) {
        return;
      }
      hasZone.current = true;
      const { ne, sw } = state.properties.bounds;
      onFirstZone(toBbox({ ne: ne as LngLat, sw: sw as LngLat }));
    },
    [onFirstZone],
  );

  // Camera moves take `map` (500 ms) with Mapbox easeTo, and jump with « Réduire les
  // animations » (D-030).
  const cameraAnimation = {
    animationMode: isReducedMotion ? ('none' as const) : ('easeTo' as const),
    animationDuration: isReducedMotion ? 0 : motion.durations.map,
  };

  // About 3 km across the screen (Ecrans › E-01).
  const home = {
    centerCoordinate: toLngLat(center),
    zoomLevel: zoomForSpan(center, initialSpanM, width),
  };

  const recenter = () => {
    camera.current?.setCamera({ ...home, ...cameraAnimation });
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
      onRoutePress(route);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <Mapbox.MapView
        style={{ flex: 1 }}
        styleJSON={mapStyleJson}
        compassEnabled={false}
        scaleBarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        logoPosition={ornamentMargin}
        attributionPosition={{ ...ornamentMargin, left: undefined, right: spacing['space-8'] }}
        onMapIdle={handleMapIdle}
        // Android drops the default camera when it loads a style given as JSON: the map is put
        // back at its opening place once loaded, on both systems.
        onDidFinishLoadingMap={() => {
          camera.current?.setCamera({ ...home, animationMode: 'none', animationDuration: 0 });
          isHome.current = true;
        }}
      >
        <Mapbox.Camera ref={camera} defaultSettings={home} />
        {hasPosition && <Mapbox.LocationPuck visible />}
        {/*
          @rnmapbox/maps links an image to the style only when its Images joins the map: a new
          set of routes, or a new text size that redraws the labels, mounts a new Images.
        */}
        <Mapbox.Images key={`${fontScale}:${routes.map((route) => route.id).join()}`}>
          {routes.map((route) => (
            <MarkerImage key={route.id} route={route} />
          ))}
        </Mapbox.Images>
        <Mapbox.ShapeSource
          id="route-markers"
          shape={routeMarkers(routes)}
          onPress={(event) => {
            const route = routeOf(event.features[0]?.properties?.routeId);
            if (route) {
              onRoutePress(route);
            }
          }}
        >
          <Mapbox.SymbolLayer
            id="route-markers"
            style={{
              iconImage: ['get', 'image'],
              iconAnchor: 'bottom',
              iconAllowOverlap: true,
              symbolZOrder: 'viewport-y',
            }}
          />
        </Mapbox.ShapeSource>
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
        <View pointerEvents="box-none" className="flex-1">
          {banner}
        </View>
        <RecenterButton onPress={recenter} />
      </View>
    </View>
  );
}

/** Image of a route marker, made again once its photo has loaded. */
function MarkerImage({ route }: { route: RouteCard }) {
  const { t } = useTranslation();
  const [photoVersion, setPhotoVersion] = useState(0);
  return (
    <MapImage name={markerImage(route.id)} version={photoVersion}>
      <MapMarker
        photoUrl={route.coverUrl}
        durationLabel={formatDuration(t, route.durationMin, 'short')}
        onPhotoSettled={() => setPhotoVersion((version) => version + 1)}
      />
    </MapImage>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
