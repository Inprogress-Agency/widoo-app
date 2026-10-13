import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Textarea } from '@widoo/ui';

const texts = messages.catalog.routes.republishDialog;

type RepublishDialogProps = {
  isOpen: boolean;
  message: string;
  onMessageChange: (message: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Republier »: why the route goes back online, required, kept in its history. */
export function RepublishDialog({
  isOpen,
  message,
  onMessageChange,
  onCancel,
  onConfirm,
  isBusy,
}: RepublishDialogProps) {
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
      <Field label={texts.message} htmlFor="republish-message" isRequired hint={texts.messageHint}>
        <Textarea
          id="republish-message"
          required
          maxLength={1000}
          aria-describedby="republish-message-hint"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
