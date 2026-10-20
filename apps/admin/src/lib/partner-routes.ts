import { maxPartnerRoutes, minPartnerRoutes } from '@widoo/shared';

/** A route chosen for the page of a partner: its title is what the person reads. */
export type PickedRoute = { id: string; title: string };

/** The routes with `route` added at the end; unchanged when it is already there or the page is full. */
export function withRoute(picked: readonly PickedRoute[], route: PickedRoute): PickedRoute[] {
  if (picked.length >= maxPartnerRoutes || picked.some((item) => item.id === route.id)) {
    return [...picked];
  }
  return [...picked, route];
}

/** The routes without the one of `routeId`. */
export function withoutRoute(picked: readonly PickedRoute[], routeId: string): PickedRoute[] {
  return picked.filter((item) => item.id !== routeId);
}

/** The routes with the one of `routeId` moved one place up (`-1`) or down (`1`), or unchanged at the end of the list. */
export function withMovedRoute(
  picked: readonly PickedRoute[],
  routeId: string,
  direction: -1 | 1,
): PickedRoute[] {
  const from = picked.findIndex((item) => item.id === routeId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= picked.length) {
    return [...picked];
  }
  const moved = [...picked];
  [moved[from], moved[to]] = [moved[to] as PickedRoute, moved[from] as PickedRoute];
  return moved;
}

/** True when the choice holds 3 to 10 routes: what the page of a partner needs. */
export function isChoiceComplete(picked: readonly PickedRoute[]): boolean {
  return picked.length >= minPartnerRoutes && picked.length <= maxPartnerRoutes;
}
