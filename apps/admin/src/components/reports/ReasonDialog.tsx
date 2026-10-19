import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Textarea } from '@widoo/ui';

type ReasonDialogProps = {
  isOpen: boolean;
  /** What the window says: its question, the effect of the decision, and its button. */
  dialog: { title: string; description: string; confirm: string };
  /** The label of the field and the line under it, which names where the reason is kept. */
  field: { reason: string; reasonHint: string };
  /** Distinguishes the field of this window in the page, for its label and its hint. */
  fieldId: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** A destructive decision of the team that asks for a required reason, kept in the journal. */
export function ReasonDialog({
  isOpen,
  dialog,
  field,
  fieldId,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isBusy,
}: ReasonDialogProps) {
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
      isBusy={isBusy}
    >
      <Field label={field.reason} htmlFor={fieldId} isRequired hint={field.reasonHint}>
        <Textarea
          id={fieldId}
          required
          maxLength={500}
          aria-describedby={`${fieldId}-hint`}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
