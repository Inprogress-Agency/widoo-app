import {
  AppConfig,
  GeocodeResult,
  LegalDocument,
  Me,
  MyDataExport,
  PlannedMapsUrl,
  PlannedRoute,
  PlannedRouteList,
  PublicProfile,
  RateRouteResult,
  RouteCount,
  RouteDetail,
  RouteRatingList,
  RouteSearchResult,
  RouteTimeline,
  SupportMessageReceipt,
  type AppLocale,
  type CreatePlannedRoute,
  type LegalDoc,
  type PublicProfileQuery,
  type RateRoute,
  type RegisterDevice,
  type SupportMessageInput,
  type UpdateMe,
  type UpdatePlannedRoute,
} from '@widoo/shared';
import {
  plannedMapsUrlPath,
  plannedPath,
  plannedQueryString,
  plannedRatingPath,
  plannedStepDonePath,
  type PlannedListParams,
} from './planned';
import {
  countQueryString,
  searchQueryString,
  type RouteCountParams,
  type RouteSearchParams,
} from './search';
import { isProfileUnavailable, publicProfilePath, type PublicProfileAnswer } from './profile';
import {
  removedOf,
  routePath,
  routeRatingsPath,
  type GetRouteOptions,
  type RouteRatingsParams,
  type RouteSheetAnswer,
} from './route';
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
     * routes and the box to search, named in `locale`, the language of the app (French when not
     * given). Public: sent without token, the text and the language and nothing else.
     */
    geocode: (text: string, signal?: AbortSignal, locale?: AppLocale) =>
      request({
        method: 'GET',
        path: `/v1/geocode?${new URLSearchParams({ q: text, ...(locale && { locale }) }).toString()}`,
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

    /**
     * `GET /v1/users/:id/profile`: the public profile of a creator (E-16), with the token of the
     * signed-in user when there is one, as the cards it holds depend on the caller (D-075).
     */
    getPublicProfile: async (
      id: string,
      query: PublicProfileQuery = {},
      signal?: AbortSignal,
    ): Promise<PublicProfileAnswer> => {
      try {
        const profile = await request({
          method: 'GET',
          path: publicProfilePath(id, query),
          schema: PublicProfile,
          auth: 'optional',
          signal,
        });
        return { kind: 'profile', profile };
      } catch (error) {
        if (isProfileUnavailable(error)) {
          return { kind: 'unavailable' };
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

    /** `GET /v1/me/planned`: the caller's plannings by start, one status or all. */
    listPlanned: (params: PlannedListParams = {}, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/me/planned${plannedQueryString(params)}`,
        schema: PlannedRouteList,
        auth: true,
        signal,
      }),

    /**
     * `POST /v1/me/planned`: plans a route (E-06), its timeline and bookings computed by the API;
     * 402 `premium_required` for a Premium route the caller has no right to.
     */
    createPlanned: (body: CreatePlannedRoute) =>
      request({ method: 'POST', path: '/v1/me/planned', body, schema: PlannedRoute, auth: true }),

    /**
     * `PATCH /v1/me/planned/:id`: moves the start (timeline recomputed, reminders reset), ticks
     * bookings or changes the status; 409 while its Go is under way.
     */
    updatePlanned: (id: string, update: UpdatePlannedRoute) =>
      request({
        method: 'PATCH',
        path: plannedPath(id),
        body: update,
        schema: PlannedRoute,
        auth: true,
      }),

    /**
     * `POST /v1/me/planned/:id/steps/:stepId/done`: « Étape suivante » of the Go (E-07); a step
     * already done stays as it was, a skipped one becomes done; 409 outside a Go.
     */
    markPlannedStepDone: (id: string, stepId: string) =>
      request({
        method: 'POST',
        path: plannedStepDonePath(id, stepId),
        schema: PlannedRoute,
        auth: true,
      }),

    /**
     * `GET /v1/me/planned/:id/maps-url`: « Itinéraire » of the Go, Google Maps on foot to the
     * first step neither done nor skipped (D-032); 409 when none is left.
     */
    getPlannedMapsUrl: (id: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: plannedMapsUrlPath(id),
        schema: PlannedMapsUrl,
        auth: true,
        signal,
      }),

    /**
     * `POST /v1/me/planned/:id/rating`: rates the route of a completed outing (E-15), or changes
     * the rating given before, with the rating of the route recomputed; 409 while the outing
     * does not open the rating (D-033).
     */
    rateOuting: (id: string, body: RateRoute) =>
      request({
        method: 'POST',
        path: plannedRatingPath(id),
        body,
        schema: RateRouteResult,
        auth: true,
      }),

    /**
     * `GET /v1/routes/:id/ratings`: the visible reviews of a route, newest first (E-05 › « Voir
     * les avis »), with the token when signed in, so that one's own review shows at once.
     */
    listRouteRatings: (id: string, params: RouteRatingsParams = {}, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: routeRatingsPath(id, params),
        schema: RouteRatingList,
        auth: 'optional',
        signal,
      }),

    /**
     * `GET /v1/legal/:doc`: the terms or the privacy policy in the language of the app, or in
     * French while it is not translated (`locale` of the answer). Public: sent without token.
     */
    getLegalDocument: (doc: LegalDoc, locale: AppLocale, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/legal/${doc}?${new URLSearchParams({ locale }).toString()}`,
        schema: LegalDocument,
        signal,
      }),

    /**
     * `POST /v1/support/messages`: « Nous écrire » (E-19), with the token of the signed-in user
     * when `getToken` gives one, without otherwise.
     */
    sendSupportMessage: (message: SupportMessageInput) =>
      request({
        method: 'POST',
        path: '/v1/support/messages',
        body: message,
        schema: SupportMessageReceipt,
        auth: 'optional',
      }),

    /** `GET /v1/me/export`: every data of the account, for the file of E-19 › Confidentialité. */
    exportMyData: (signal?: AbortSignal) =>
      request({ method: 'GET', path: '/v1/me/export', schema: MyDataExport, auth: true, signal }),

    /** `DELETE /v1/me`: anonymizes the account; its token is refused afterwards. */
    deleteMe: () => requestEmpty({ method: 'DELETE', path: '/v1/me', auth: true }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
