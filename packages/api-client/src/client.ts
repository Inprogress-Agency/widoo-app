import {
  AppConfig,
  GeocodeResult,
  Me,
  RouteCount,
  RouteDetail,
  RouteSearchResult,
  RouteTimeline,
  type RegisterDevice,
  type UpdateMe,
} from '@widoo/shared';
import {
  countQueryString,
  searchQueryString,
  type RouteCountParams,
  type RouteSearchParams,
} from './search';
import { removedOf, routePath, type GetRouteOptions, type RouteSheetAnswer } from './route';
import { createTransport, type ApiClientOptions } from './transport';

/**
 * Typed client of the API, one method per route, answers validated by the `shared` schemas.
 * Framework free: the app wraps it in TanStack Query, the admin may use it as is.
 */
export function createApiClient(options: ApiClientOptions) {
  const { request, requestEmpty } = createTransport(options);

  return {
    /**
     * `GET /v1/config`: taxonomies, French labels, bucket thresholds, anecdote questions,
     * certification thresholds, oldest supported build.
     */
    getConfig: (signal?: AbortSignal) =>
      request({ method: 'GET', path: '/v1/config', schema: AppConfig, signal }),

    /** `GET /v1/me`: the caller's account, created on the first call. */
    getMe: (signal?: AbortSignal) =>
      request({ method: 'GET', path: '/v1/me', schema: Me, auth: true, signal }),

    /**
     * `PATCH /v1/me`: listed fields only; notification preferences are merged, anecdotes and
     * featured routes replaced as a whole.
     */
    updateMe: (update: UpdateMe) =>
      request({ method: 'PATCH', path: '/v1/me', body: update, schema: Me, auth: true }),

    /**
     * `GET /v1/routes/search`: the routes of a map zone, or its clusters when the zone is too
     * large. Public, with the token of the signed-in user when `getToken` gives one: the cards of
     * the Premium routes the user has the right to come unlocked (D-075).
     */
    searchRoutes: (params: RouteSearchParams, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/routes/search?${searchQueryString(params)}`,
        schema: RouteSearchResult,
        auth: 'optional',
        signal,
      }),

    /**
     * `GET /v1/routes/search/count`: how many routes the search holds, over all its pages, and
     * with `breakdown`, how many without each active filter group. Public: sent without token.
     */
    countRoutes: (params: RouteCountParams, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/routes/search/count?${countQueryString(params)}`,
        schema: RouteCount,
        signal,
      }),

    /**
     * `GET /v1/geocode`: the zones of a text typed in the search (E-02), each with its number of
     * routes and the box to search. Public: sent without token, the text and nothing else.
     */
    geocode: (text: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/geocode?${new URLSearchParams({ q: text }).toString()}`,
        schema: GeocodeResult,
        signal,
      }),

    /**
     * `GET /v1/routes/:id`: the route sheet (E-05), reduced for a Premium route the caller has
     * no right to (D-014); a withdrawn route answers its date instead. Public, with the token of
     * the signed-in user when `getToken` gives one.
     */
    getRoute: async (id: string, options: GetRouteOptions = {}): Promise<RouteSheetAnswer> => {
      try {
        const route = await request({
          method: 'GET',
          path: routePath(id, options.token),
          schema: RouteDetail,
          auth: 'optional',
          signal: options.signal,
        });
        return { kind: 'route', route };
      } catch (error) {
        const removed = removedOf(error);
        if (removed) {
          return removed;
        }
        throw error;
      }
    },

    /** `GET /v1/routes/:id/timeline`: the times of the steps for a start, and their conflicts. */
    getRouteTimeline: (id: string, startsAt: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/routes/${encodeURIComponent(id)}/timeline?${new URLSearchParams({ startsAt }).toString()}`,
        schema: RouteTimeline,
        auth: 'optional',
        signal,
      }),

    /**
     * `POST /v1/me/devices`: the push token of this phone and its language, the language of the
     * push while the account follows the phone (D-062).
     */
    registerDevice: (device: RegisterDevice) =>
      requestEmpty({ method: 'POST', path: '/v1/me/devices', body: device, auth: true }),

    /** `DELETE /v1/me`: anonymizes the account; its token is refused afterwards. */
    deleteMe: () => requestEmpty({ method: 'DELETE', path: '/v1/me', auth: true }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
