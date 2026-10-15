import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import type { RejectionReason } from '@widoo/shared';
import { useRouteAction } from './useRouteAction';

const texts = messages.reports.routes.toasts;

/** An empty note is no note: the API takes a text of at least one character, or none. */
const noteOf = (note: string) => note.trim() || undefined;

/**
 * The decisions on a report of a route (A-03). Accepting or rejecting only decides the report. A
 * low rating has no reader to thank: keeping the route rejects the report, and asking for changes
 * or unpublishing act on the route first, then accept the report. `onSettled` is called once the
 * report is decided, by this member of the team or by another one.
 */
export function useRouteReportActions(
  report: { id: string; routeId: string },
  onSettled: () => void,
) {
  const { isBusy, send } = useRouteAction(onSettled);
  const { api } = getSessionClients();
  const resolve = (outcome: 'accepted' | 'rejected', note?: string) =>
    api.resolveReport(report.id, { outcome, note });
  return {
    isBusy,
    accept: (note: string) => send(() => resolve('accepted', noteOf(note)), texts.accepted),
    reject: (note: string) => send(() => resolve('rejected', noteOf(note)), texts.rejected),
    keep: (note: string) => send(() => resolve('rejected', noteOf(note)), texts.kept),
    requestChanges: (message: string) =>
      send(async () => {
        await api.requestRouteChanges(report.routeId, { message });
        await resolve('accepted', message);
      }, texts.changesRequested),
    unpublish: (reasonCode: RejectionReason, message: string) =>
      send(async () => {
        await api.unpublishRoute(report.routeId, { reasonCode, message });
        await resolve('accepted', message);
      }, texts.unpublished),
  };
}
