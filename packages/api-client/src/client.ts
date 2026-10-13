import {
  AdminCounters,
  AdminStats,
  AppConfig,
  CatalogRouteAction,
  CatalogRoutes,
  GeocodeResult,
  Me,
  ModerationDecision,
  ModerationQueue,
  ModerationRouteDetail,
  RouteCount,
  RouteSearchResult,
  type CatalogRoutesQuery,
  type RejectionBody,
  type RepublishBody,
  type RequestChangesBody,
  type UpdateMe,
} from '@widoo/shared';
import { catalogQueryString } from './catalog';
import { moderationQueryString, type ModerationQueueParams } from './moderation';
import {
  countQueryString,
  searchQueryString,
  type RouteCountParams,
  type RouteSearchParams,
} from './search';
import { createTransport, type ApiClientOptions } from './transport';

/**
 * Typed client of the API, one method per route, answers validated by the `shared` schemas.
 * Framework free: the app wraps it in TanStack Query, the admin may use it as is.
 */
export function createApiClient(options: ApiClientOptions) {
  const { request, requestEmpty } = createTransport(options);

  return {
    /** `GET /v1/config`: taxonomies, French labels, bucket thresholds, oldest supported build. */
    getConfig: (signal?: AbortSignal) =>
      request({ method: 'GET', path: '/v1/config', schema: AppConfig, signal }),

    /** `GET /v1/me`: the caller's account, created on the first call. */
    getMe: (signal?: AbortSignal) =>
      request({ method: 'GET', path: '/v1/me', schema: Me, auth: true, signal }),

    /** `PATCH /v1/me`: listed fields only; notification preferences are merged. */
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
     * `GET /v1/admin/counters`: what waits in each section of the admin the caller opens. Team
     * only: 403 for any other account, and without a second factor (`mfa_required`).
     */
    getAdminCounters: (signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: '/v1/admin/counters',
        schema: AdminCounters,
        auth: true,
        signal,
      }),

    /** `GET /v1/admin/stats`: the figures of the dashboard (A-05), for the role of the caller. */
    getAdminStats: (signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: '/v1/admin/stats',
        schema: AdminStats,
        auth: true,
        signal,
      }),

    /** `GET /v1/admin/moderation`: a page of the moderation queue (A-02). Moderators and admins. */
    getModerationQueue: (params: ModerationQueueParams, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/moderation?${moderationQueryString(params)}`,
        schema: ModerationQueue,
        auth: true,
        signal,
      }),

    /** `GET /v1/admin/routes/:id`: the moderation sheet of a route (A-02). 404 when unknown. */
    getModerationRoute: (routeId: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/routes/${routeId}`,
        schema: ModerationRouteDetail,
        auth: true,
        signal,
      }),

    /**
     * Decisions of a moderator on a route. A route another member of the team already decided
     * answers 409 `already_decided`, with the status it was given in `details`.
     */
    publishRoute: (routeId: string) =>
      request({
        method: 'POST',
        path: `/v1/admin/routes/${routeId}/publish`,
        schema: ModerationDecision,
        auth: true,
      }),
    requestRouteChanges: (routeId: string, body: RequestChangesBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/routes/${routeId}/request-changes`,
        body,
        schema: ModerationDecision,
        auth: true,
      }),
    rejectRoute: (routeId: string, body: RejectionBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/routes/${routeId}/reject`,
        body,
        schema: ModerationDecision,
        auth: true,
      }),
    unpublishRoute: (routeId: string, body: RejectionBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/routes/${routeId}/unpublish`,
        body,
        schema: ModerationDecision,
        auth: true,
      }),

    /**
     * `GET /v1/admin/routes`: a page of the routes of the catalog (A-04), whatever their status.
     * An editor receives the routes of the team only.
     */
    getCatalogRoutes: (params: Partial<CatalogRoutesQuery>, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/routes?${catalogQueryString(params)}`,
        schema: CatalogRoutes,
        auth: true,
        signal,
      }),

    /** `POST /v1/admin/routes/:id/republish`: puts an unpublished route back online. Admins. */
    republishRoute: (routeId: string, body: RepublishBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/routes/${routeId}/republish`,
        body,
        schema: CatalogRouteAction,
        auth: true,
      }),

    /** `POST /v1/admin/routes/:id/reassign`: hands a route over to the Widoo team. Admins. */
    reassignRoute: (routeId: string) =>
      request({
        method: 'POST',
        path: `/v1/admin/routes/${routeId}/reassign`,
        schema: CatalogRouteAction,
        auth: true,
      }),

    /** `DELETE /v1/me`: anonymizes the account; its token is refused afterwards. */
    deleteMe: () => requestEmpty({ method: 'DELETE', path: '/v1/me', auth: true }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
