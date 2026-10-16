import {
  AdminRatings,
  AdminUserDetail,
  AdminUsers,
  AdminRouteReports,
  AdminSignaledPlaces,
  PlaceActionResult,
  ResolvedReport,
  PlaceImportResult,
  CatalogPlaces,
  CatalogPlaceDetail,
  CatalogRoutes,
  CatalogRouteAction,
  ModerationRouteDetail,
  ModerationQueue,
  ModerationDecision,
  AdminCounters,
  AdminStats,
  AppConfig,
  GeocodeResult,
  LegalDocument,
  Me,
  MyDataExport,
  PlannedRoute,
  PlannedRouteList,
  PublicProfile,
  RouteCount,
  RouteDetail,
  RouteSearchResult,
  RouteTimeline,
  SupportMessageReceipt,
  type AppLocale,
  type CreatePlannedRoute,
  type LegalDoc,
  type PublicProfileQuery,
  type RegisterDevice,
  type SupportMessageInput,
  type UpdateMe,
  type UpdatePlannedRoute,
  type RejectionBody,
  type RequestChangesBody,
  type CatalogRoutesQuery,
  type RepublishBody,
  type AdminRatingsQuery,
  type AdminReportsQuery,
  type AdminSignalsQuery,
  type AdminUsersQuery,
  type CertificationBody,
  type ChangeUserRoleBody,
  type GiftBody,
  type UserReasonBody,
  type CatalogPlaceInput,
  type ClosePlaceBody,
  type ResolveReportBody,
  type CatalogPlacesQuery,
  type PlaceImportBody,
} from '@widoo/shared';
import { plannedPath, plannedQueryString, type PlannedListParams } from './planned';
import {
  countQueryString,
  searchQueryString,
  type RouteCountParams,
  type RouteSearchParams,
} from './search';
import { isProfileUnavailable, publicProfilePath, type PublicProfileAnswer } from './profile';
import { removedOf, routePath, type GetRouteOptions, type RouteSheetAnswer } from './route';
import { createTransport, type ApiClientOptions } from './transport';
import { moderationQueryString, type ModerationQueueParams } from './moderation';
import { catalogPlacesQueryString, catalogQueryString } from './catalog';
import { usersQueryString } from './users';
import { ratingsQueryString, reportsQueryString, signalsQueryString } from './reports';

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

    /** `GET /v1/admin/places`: a page of the places of the catalog (A-04). */
    getCatalogPlaces: (params: Partial<CatalogPlacesQuery>, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/places?${catalogPlacesQueryString(params)}`,
        schema: CatalogPlaces,
        auth: true,
        signal,
      }),

    /** `GET /v1/admin/places/:id`: the sheet of a place, its hours and the routes that use it. */
    getCatalogPlace: (placeId: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/places/${placeId}`,
        schema: CatalogPlaceDetail,
        auth: true,
        signal,
      }),

    /** `POST /v1/admin/places`: creates a place by hand. Editors and admins. */
    createCatalogPlace: (place: CatalogPlaceInput) =>
      request({
        method: 'POST',
        path: '/v1/admin/places',
        body: place,
        schema: CatalogPlaceDetail,
        auth: true,
      }),

    /** `PATCH /v1/admin/places/:id`: replaces the sheet of a place. Editors and admins. */
    updateCatalogPlace: (placeId: string, place: CatalogPlaceInput) =>
      request({
        method: 'PATCH',
        path: `/v1/admin/places/${placeId}`,
        body: place,
        schema: CatalogPlaceDetail,
        auth: true,
      }),

    /**
     * `POST /v1/admin/places/import`: creates the places of a file, row by row, or says what
     * each row would become with `dryRun`. Admins.
     */
    importPlaces: (body: PlaceImportBody) =>
      request({
        method: 'POST',
        path: '/v1/admin/places/import',
        body,
        schema: PlaceImportResult,
        auth: true,
      }),

    /** `GET /v1/admin/reports`: the open reports of routes, oldest first (A-03). */
    getAdminReports: (params: Partial<AdminReportsQuery>, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/reports?${reportsQueryString(params)}`,
        schema: AdminRouteReports,
        auth: true,
        signal,
      }),

    /** `POST /v1/admin/reports/:id/resolve`: accepts or rejects a report, with a note. */
    resolveReport: (reportId: string, body: ResolveReportBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/reports/${reportId}/resolve`,
        body,
        schema: ResolvedReport,
        auth: true,
      }),

    /** `GET /v1/admin/signals`: the places the community flagged, with their routes (A-03). */
    getAdminSignals: (params: Partial<AdminSignalsQuery>, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/signals?${signalsQueryString(params)}`,
        schema: AdminSignaledPlaces,
        auth: true,
        signal,
      }),

    /** `POST /v1/admin/places/:id/verify`: marks a place verified by the team. */
    verifyPlace: (placeId: string) =>
      request({
        method: 'POST',
        path: `/v1/admin/places/${placeId}/verify`,
        schema: PlaceActionResult,
        auth: true,
      }),

    /** `POST /v1/admin/places/:id/close`: closes a place, its routes become `needs_fix`. */
    closePlace: (placeId: string, body: ClosePlaceBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/places/${placeId}/close`,
        body,
        schema: PlaceActionResult,
        auth: true,
      }),

    /** `GET /v1/admin/users`: the accounts, newest first, searched by e-mail, first name or id (A-06). */
    getAdminUsers: (params: Partial<AdminUsersQuery>, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/users?${usersQueryString(params)}`,
        schema: AdminUsers,
        auth: true,
        signal,
      }),

    /** `GET /v1/admin/users/:id`: the card of an account. */
    getAdminUser: (userId: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/users/${userId}`,
        schema: AdminUserDetail,
        auth: true,
        signal,
      }),

    /** `PATCH /v1/admin/users/:id/role`: changes a role (admin only, never one's own). */
    changeUserRole: (userId: string, body: ChangeUserRoleBody) =>
      request({
        method: 'PATCH',
        path: `/v1/admin/users/${userId}/role`,
        body,
        schema: AdminUserDetail,
        auth: true,
      }),

    /** `POST /v1/admin/users/:id/suspend`: suspends an account, with a reason. */
    suspendUser: (userId: string, body: UserReasonBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/users/${userId}/suspend`,
        body,
        schema: AdminUserDetail,
        auth: true,
      }),

    /** `POST /v1/admin/users/:id/reactivate`: lifts a suspension, with a reason. */
    reactivateUser: (userId: string, body: UserReasonBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/users/${userId}/reactivate`,
        body,
        schema: AdminUserDetail,
        auth: true,
      }),

    /** `POST /v1/admin/users/:id/gift`: offers Premium until a date, or one Premium route. */
    giftUser: (userId: string, body: GiftBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/users/${userId}/gift`,
        body,
        schema: AdminUserDetail,
        auth: true,
      }),

    /** `POST /v1/admin/users/:id/certification`: awards or removes the Créateur certifié badge. */
    setUserCertification: (userId: string, body: CertificationBody) =>
      request({
        method: 'POST',
        path: `/v1/admin/users/${userId}/certification`,
        body,
        schema: AdminUserDetail,
        auth: true,
      }),

    /** `GET /v1/admin/users/:id/export`: the data of an account, the same file as the app's. */
    exportUserData: (userId: string, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/users/${userId}/export`,
        schema: MyDataExport,
        auth: true,
        signal,
      }),

    /** `DELETE /v1/admin/users/:id`: deletes an account with the rule of the app. */
    deleteUser: (userId: string) =>
      requestEmpty({ method: 'DELETE', path: `/v1/admin/users/${userId}`, auth: true }),

    /** `GET /v1/admin/ratings`: the ratings with a comment, filtered by note and route (A-03). */
    getAdminRatings: (params: Partial<AdminRatingsQuery>, signal?: AbortSignal) =>
      request({
        method: 'GET',
        path: `/v1/admin/ratings?${ratingsQueryString(params)}`,
        schema: AdminRatings,
        auth: true,
        signal,
      }),

    /** `DELETE /v1/me`: anonymizes the account; its token is refused afterwards. */
    deleteMe: () => requestEmpty({ method: 'DELETE', path: '/v1/me', auth: true }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
