import { ReasonFields } from '@/components/confirm/ReasonFields';
import { messages } from '@/messages/fr';
import { labels, taxonomies } from '@widoo/shared';
import { ConfirmDialog } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.moderation.decisions.rejectDialog;

/** The seven codified reasons of a refusal, in the order of the wiki, each explained. */
const reasons = taxonomies.rejectionReasons.map((code) => ({
  code,
  label: labels.fr.rejectionReasons[code],
  description: texts.reasonExplanations[code],
}));

type RejectDialogProps = {
  isOpen: boolean;
  /** First name of the author, for « Message à Camille »; null when the account is purged. */
  authorFirstName: string | null;
  /** When the version still online was published, for a revision; null for a first submission. */
  publishedVersionOn: string | null;
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
  authorFirstName,
  publishedVersionOn,
  reasonCode,
  onReasonCodeChange,
  message,
  onMessageChange,
  onCancel,
  onConfirm,
  isBusy,
}: RejectDialogProps) {
  const [isMessageMissing, setIsMessageMissing] = useState(false);
  const isRevision = publishedVersionOn !== null;

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
      title={isRevision ? texts.revisionTitle : texts.title}
      description={isRevision ? texts.revisionDescription(publishedVersionOn) : texts.description}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={isRevision ? texts.revisionConfirm : texts.confirm}
      isBusy={isBusy}
    >
      <ReasonFields
        id="reject"
        options={reasons}
        reasonLayout="radios"
        reasonCode={reasonCode}
        onReasonCodeChange={onReasonCodeChange}
        detail={message}
        onDetailChange={handleMessageChange}
        detailLabel={authorFirstName ? texts.messageTo(authorFirstName) : texts.message}
        detailHint={texts.messageHint}
        detailPlaceholder={texts.messagePlaceholder}
        detailError={isMessageMissing ? texts.messageRequired : undefined}
      />
    </ConfirmDialog>
  );
}
