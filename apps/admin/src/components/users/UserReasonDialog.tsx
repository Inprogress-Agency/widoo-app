import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Textarea } from '@widoo/ui';

const texts = messages.users.dialogs;

type UserReasonDialogProps = {
  isOpen: boolean;
  /** What the window says: its question, the effect on the account, and its button. */
  dialog: { title: string; description: string; confirm: string };
  /** Red for a suspension, which refuses an account; blue for lifting it. */
  isDestructive: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** Suspension or reactivation of an account, with the required reason kept in the journal. */
export function UserReasonDialog({
  isOpen,
  dialog,
  isDestructive,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isBusy,
}: UserReasonDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={dialog.title}
      description={dialog.description}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={dialog.confirm}
      confirmVariant={isDestructive ? 'destructive' : 'primary'}
      isBusy={isBusy}
    >
      <Field label={texts.reason} htmlFor="user-reason" isRequired hint={texts.reasonHint}>
        <Textarea
          id="user-reason"
          required
          maxLength={500}
          aria-describedby="user-reason-hint"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
