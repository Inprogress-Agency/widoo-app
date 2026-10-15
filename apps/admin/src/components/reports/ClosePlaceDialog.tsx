import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Textarea } from '@widoo/ui';

const texts = messages.reports.places.closeDialog;

type ClosePlaceDialogProps = {
  isOpen: boolean;
  /** Published routes that go through the place: they become « à corriger ». */
  routeCount: number;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Fermer le lieu »: the effect on its routes, and a required reason kept in the journal. */
export function ClosePlaceDialog({
  isOpen,
  routeCount,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isBusy,
}: ClosePlaceDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={texts.title}
      description={texts.description(routeCount)}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={texts.confirm}
      isBusy={isBusy}
    >
      <Field label={texts.reason} htmlFor="close-place-reason" isRequired hint={texts.reasonHint}>
        <Textarea
          id="close-place-reason"
          required
          maxLength={500}
          aria-describedby="close-place-reason-hint"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
