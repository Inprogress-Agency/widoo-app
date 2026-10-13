import type { GetRouteOptions, RouteSheetAnswer } from '@widoo/api-client';
import { createContext, useContext } from 'react';
import { fixtureSource } from './fixtureSource';

/**
 * Where the route sheet (E-05) reads a route: `api.getRoute` once `GET /v1/routes/:id` exists
 * (#36), the demo route sheets until then. Same answers, same errors (`ApiRequestError`).
 */
export interface RouteSheetSource {
  getRoute: (id: string, options?: GetRouteOptions) => Promise<RouteSheetAnswer>;
}

export const RouteSheetSourceContext = createContext<RouteSheetSource>(fixtureSource);

export function useRouteSheetSource(): RouteSheetSource {
  return useContext(RouteSheetSourceContext);
}
