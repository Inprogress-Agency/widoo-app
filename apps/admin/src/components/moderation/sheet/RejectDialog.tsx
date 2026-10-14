import { ReasonFields } from '@/components/confirm/ReasonFields';
import { messages } from '@/messages/fr';
import { labels, taxonomies } from '@widoo/shared';
import { ConfirmDialog } from '@widoo/ui';

const texts = messages.moderation.decisions.rejectDialog;

/** The seven codified reasons of a refusal, in the order of the wiki. */
const reasons = taxonomies.rejectionReasons.map((code) => ({
  code,
  label: labels.fr.rejectionReasons[code],
}));

type RejectDialogProps = {
  isOpen: boolean;
  reasonCode: string;
  onReasonCodeChange: (code: string) => void;
  message: string;
  onMessageChange: (message: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Refuser »: a codified reason and a message to the author, both required. */
export function RejectDialog({
  isOpen,
  reasonCode,
  onReasonCodeChange,
  message,
  onMessageChange,
  onCancel,
  onConfirm,
  isBusy,
}: RejectDialogProps) {
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
        id="reject"
        options={reasons}
        reasonCode={reasonCode}
        onReasonCodeChange={onReasonCodeChange}
        detail={message}
        onDetailChange={onMessageChange}
        detailLabel={texts.message}
        detailHint={texts.messageHint}
      />
    </ConfirmDialog>
  );
}
