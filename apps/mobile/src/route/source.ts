import type { GetRouteOptions, RouteSheetAnswer } from '@widoo/api-client';
import type { RouteTimeline } from '@widoo/shared';
import { createContext, useContext } from 'react';
import { fixtureSource } from './fixtureSource';

/**
 * Where the route sheet (E-05) reads a route, and the planning (E-06) its timeline for a start:
 * `api.getRoute` and `api.getRouteTimeline` once `GET /v1/routes/:id` and its `/timeline` exist
 * (#36), the demo route sheets until then. Same answers, same errors (`ApiRequestError`).
 */
export interface RouteSheetSource {
  getRoute: (id: string, options?: GetRouteOptions) => Promise<RouteSheetAnswer>;
  getTimeline: (id: string, startsAt: string, signal?: AbortSignal) => Promise<RouteTimeline>;
}

export const RouteSheetSourceContext = createContext<RouteSheetSource>(fixtureSource);

export function useRouteSheetSource(): RouteSheetSource {
  return useContext(RouteSheetSourceContext);
}
