import type { LatLng } from '@widoo/shared';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';

// Streets of Mapbox as they are: the admin has no map style of its own.
const mapStyle = 'mapbox://styles/mapbox/streets-v12';
// Where the map opens for a place that has no position yet: Paris, the first city of Widoo.
const defaultCenter: LatLng = { lat: 48.8566, lng: 2.3522 };
const cityZoom = 11;
const streetZoom = 15;

type PositionMapOptions = {
  /** Public token of Mapbox. */
  token: string;
  /** Where the pin stands; null while the form holds no readable position. */
  position: LatLng | null;
  /** The pin was dropped, or the map clicked, at this position. */
  onMove: (position: LatLng) => void;
};

/**
 * A Mapbox map with one pin that can be moved (A-04): the pin follows `position`, and a drag of
 * the pin or a click on the map calls `onMove`. Mapbox GL is loaded with the map only, so the
 * other pages do not carry it. Returns the element to draw the map in, and how far it is.
 */
export function usePositionMap({ token, position, onMove }: PositionMapOptions) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const latest = useRef({ position, onMove });
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    latest.current = { position, onMove };
  });

  useEffect(() => {
    let isCancelled = false;
    let created: MapboxMap | undefined;
    void import('mapbox-gl')
      .then(({ default: mapboxgl }) => {
        if (isCancelled || !container.current) {
          return;
        }
        const start = latest.current.position;
        const center = start ?? defaultCenter;
        created = new mapboxgl.Map({
          accessToken: token,
          container: container.current,
          style: mapStyle,
          center: [center.lng, center.lat],
          zoom: start ? streetZoom : cityZoom,
        });
        created.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        const marker = new mapboxgl.Marker({ draggable: true, color: color.trim() || undefined });
        marker.on('dragend', () => {
          const { lat, lng } = marker.getLngLat();
          latest.current.onMove({ lat, lng });
        });
        created.on('click', (event) =>
          latest.current.onMove({ lat: event.lngLat.lat, lng: event.lngLat.lng }),
        );
        created.on('load', () => setStatus('ready'));
        // A refused token or an unreachable style, before the map ever showed.
        created.on('error', () =>
          setStatus((current) => (current === 'ready' ? current : 'failed')),
        );
        map.current = created;
        pin.current = marker;
      })
      .catch(() => setStatus('failed'));
    return () => {
      isCancelled = true;
      created?.remove();
      map.current = null;
      pin.current = null;
    };
  }, [token]);

  const lat = position?.lat;
  const lng = position?.lng;
  useEffect(() => {
    if (
      status !== 'ready' ||
      !map.current ||
      !pin.current ||
      lat === undefined ||
      lng === undefined
    ) {
      return;
    }
    pin.current.setLngLat([lng, lat]).addTo(map.current);
    if (!map.current.getBounds()?.contains([lng, lat])) {
      map.current.easeTo({ center: [lng, lat] });
    }
  }, [status, lat, lng]);

  return { container, status };
}
