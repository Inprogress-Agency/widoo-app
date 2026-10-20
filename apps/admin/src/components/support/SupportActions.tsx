import { messages } from '@/messages/fr';
import { Button } from '@widoo/ui';

type SupportActionsProps = {
  onMarkHandled: () => void;
  isBusy: boolean;
};

/** The action of the card of a message that is still to handle (A-13): mark it handled. */
export function SupportActions({ onMarkHandled, isBusy }: SupportActionsProps) {
  return (
    <Button onClick={onMarkHandled} disabled={isBusy}>
      {messages.support.panel.markHandled}
    </Button>
  );
}
