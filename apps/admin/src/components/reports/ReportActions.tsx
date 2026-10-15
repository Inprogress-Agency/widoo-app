import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.reports.routes;

export type ReportActionName = 'accept' | 'reject' | 'keep' | 'requestChanges' | 'unpublish';

type ReportActionsProps = {
  /** A note-based report offers « Garder », « Demander des modifications » and « Dépublier ». */
  isLowRating: boolean;
  /** Address of the sheet of the route, to read it before deciding. */
  routePath: string;
  onAct: (action: ReportActionName) => void;
  isBusy: boolean;
};

/**
 * The decisions on a report (A-03). A report of a reader is accepted or rejected, with a note; a
 * low rating, which has no reader to thank, is kept, sent back for changes, or taken offline.
 */
export function ReportActions({ isLowRating, routePath, onAct, isBusy }: ReportActionsProps) {
  return (
    <>
      <Button asChild variant="outline">
        <Link href={routePath}>{texts.panel.openRoute}</Link>
      </Button>
      {isLowRating ? (
        <>
          <Button onClick={() => onAct('keep')} disabled={isBusy}>
            {texts.actions.keep}
          </Button>
          <Button variant="secondary" onClick={() => onAct('requestChanges')} disabled={isBusy}>
            {texts.actions.requestChanges}
          </Button>
          <Button variant="destructiveOutline" onClick={() => onAct('unpublish')} disabled={isBusy}>
            {texts.actions.unpublish}
          </Button>
        </>
      ) : (
        <>
          <Button onClick={() => onAct('accept')} disabled={isBusy}>
            {texts.actions.accept}
          </Button>
          <Button variant="secondary" onClick={() => onAct('reject')} disabled={isBusy}>
            {texts.actions.reject}
          </Button>
        </>
      )}
    </>
  );
}
