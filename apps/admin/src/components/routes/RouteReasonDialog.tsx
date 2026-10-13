import { ReasonFields } from '@/components/confirm/ReasonFields';
import { messages } from '@/messages/fr';
import { labels, taxonomies } from '@widoo/shared';
import { ConfirmDialog } from '@widoo/ui';

/** The seven codified reasons of a refusal or an unpublication, in the order of the wiki. */
const reasons = taxonomies.rejectionReasons.map((code) => ({
  code,
  label: labels.fr.rejectionReasons[code],
}));

type RouteReasonDialogProps = {
  /** Prefix of the `id` of its fields, unique on the page. */
  id: string;
  /** What the window says: its question, the effect of the action, and its buttons. */
  texts: { title: string; description: string; message: string; confirm: string };
  isOpen: boolean;
  reasonCode: string;
  onReasonCodeChange: (code: string) => void;
  message: string;
  onMessageChange: (message: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/**
 * Confirmation of an action that takes a route away from its author's readers, refusing it or
 * unpublishing it: a codified reason and a message to the author, both required.
 */
export function RouteReasonDialog({
  id,
  texts,
  isOpen,
  reasonCode,
  onReasonCodeChange,
  message,
  onMessageChange,
  onCancel,
  onConfirm,
  isBusy,
}: RouteReasonDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={texts.title}
      description={texts.description}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={texts.confirm}
      isBusy={isBusy}
    >
      <ReasonFields
        id={id}
        options={reasons}
        reasonCode={reasonCode}
        onReasonCodeChange={onReasonCodeChange}
        detail={message}
        onDetailChange={onMessageChange}
        detailLabel={texts.message}
        detailHint={messages.moderation.decisions.requestChangesDialog.messageHint}
      />
    </ConfirmDialog>
  );
}
