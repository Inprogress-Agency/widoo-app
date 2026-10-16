// The scheme of the app (`scheme` in apps/mobile/app.json) and its screen `route/[id]`.
const appScheme = 'widoo';

/** The address that opens a route in the Widoo app, on a device where it is installed. */
export const routeAppLink = (routeId: string) =>
  `${appScheme}://route/${encodeURIComponent(routeId)}`;
