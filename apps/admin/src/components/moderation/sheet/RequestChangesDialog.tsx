import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Textarea } from '@widoo/ui';

const texts = messages.moderation.decisions.requestChangesDialog;

type RequestChangesDialogProps = {
  isOpen: boolean;
  message: string;
  onMessageChange: (message: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Demander des modifications »: a required message to the author, then the request. */
export function RequestChangesDialog({
  isOpen,
  message,
  onMessageChange,
  onCancel,
  onConfirm,
  isBusy,
}: RequestChangesDialogProps) {
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
      confirmVariant="primary"
      isBusy={isBusy}
    >
      <Field
        label={texts.message}
        htmlFor="request-changes-message"
        isRequired
        hint={texts.messageHint}
      >
        <Textarea
          id="request-changes-message"
          required
          maxLength={1000}
          aria-describedby="request-changes-message-hint"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
