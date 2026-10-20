import type { GetRouteOptions, GetRouteTimelineOptions, RouteSheetAnswer } from '@widoo/api-client';
import type { RouteTimeline } from '@widoo/shared';
import { createContext, useContext } from 'react';
import { api } from '../api/client';

/**
 * Where the route sheet (E-05) reads a route, and the planning (E-06) its timeline for a start:
 * `GET /v1/routes/:id` and its `/timeline` (#36), through the client of the app. The tests give
 * their own, by `RouteSheetSourceContext`. Offline or on a failure, the sheet shows its error
 * state: no fixture stands in for the API.
 */
export interface RouteSheetSource {
  getRoute: (id: string, options?: GetRouteOptions) => Promise<RouteSheetAnswer>;
  getTimeline: (
    id: string,
    startsAt: string,
    options?: GetRouteTimelineOptions,
  ) => Promise<RouteTimeline>;
}

export const apiRouteSheetSource: RouteSheetSource = {
  getRoute: (id, options) => api.getRoute(id, options),
  getTimeline: (id, startsAt, options) => api.getRouteTimeline(id, startsAt, options),
};

export const RouteSheetSourceContext = createContext<RouteSheetSource>(apiRouteSheetSource);

export function useRouteSheetSource(): RouteSheetSource {
  return useContext(RouteSheetSourceContext);
}
