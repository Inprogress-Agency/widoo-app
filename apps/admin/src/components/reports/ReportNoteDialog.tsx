import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Textarea } from '@widoo/ui';

const texts = messages.reports.routes.dialogs;

type ReportNoteDialogProps = {
  isOpen: boolean;
  /** What the window says: its question, the effect of the decision, and its button. */
  dialog: { title: string; description: string; confirm: string };
  note: string;
  onNoteChange: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** A decision on a report with an optional note for the team, kept in the journal. */
export function ReportNoteDialog({
  isOpen,
  dialog,
  note,
  onNoteChange,
  onCancel,
  onConfirm,
  isBusy,
}: ReportNoteDialogProps) {
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
      confirmVariant="primary"
      isBusy={isBusy}
    >
      <Field label={texts.note} htmlFor="report-note" hint={texts.noteHint}>
        <Textarea
          id="report-note"
          maxLength={500}
          aria-describedby="report-note-hint"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
