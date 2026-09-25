import Mapbox from '@rnmapbox/maps';

// `process.env.EXPO_PUBLIC_*` must be read literally for Expo to inline it in the bundle. A
// public token (pk.…): it ships inside the app, like any Mapbox public token.
const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (!token && !__DEV__) {
  throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is not set');
}
void Mapbox.setAccessToken(token ?? null);
// Mapbox telemetry would send usage and location events to Mapbox: off (wiki Securite-et-RGPD).
Mapbox.setTelemetryEnabled(false);

export { Mapbox };
