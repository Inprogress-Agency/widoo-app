import { ReasonFields } from '@/components/confirm/ReasonFields';
import { messages } from '@/messages/fr';
import { labels, taxonomies } from '@widoo/shared';
import { ConfirmDialog } from '@widoo/ui';
import { useState } from 'react';

const messageTexts = messages.moderation.decisions.rejectDialog;

/** The seven codified reasons of a refusal or an unpublication, each explained, in wiki order. */
const reasons = taxonomies.rejectionReasons.map((code) => ({
  code,
  label: labels.fr.rejectionReasons[code],
  description: messageTexts.reasonExplanations[code],
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
 * unpublishing it: one of the codified reasons and a message to the author, both required.
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
  const [isMessageMissing, setIsMessageMissing] = useState(false);

  const handleConfirm = () => {
    if (message.trim() === '') {
      setIsMessageMissing(true);
      return;
    }
    onConfirm();
  };
  const handleMessageChange = (next: string) => {
    setIsMessageMissing(false);
    onMessageChange(next);
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={handleConfirm}
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
        reasonLayout="radios"
        reasonCode={reasonCode}
        onReasonCodeChange={onReasonCodeChange}
        detail={message}
        onDetailChange={handleMessageChange}
        detailLabel={texts.message}
        detailHint={messageTexts.messageHint}
        detailPlaceholder={messageTexts.messagePlaceholder}
        detailError={isMessageMissing ? messageTexts.messageRequired : undefined}
      />
    </ConfirmDialog>
  );
}
