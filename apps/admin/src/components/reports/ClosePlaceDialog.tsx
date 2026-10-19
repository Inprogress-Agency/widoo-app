import { messages } from '@/messages/fr';
import { ReasonDialog } from './ReasonDialog';

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
export function ClosePlaceDialog({ routeCount, ...props }: ClosePlaceDialogProps) {
  return (
    <ReasonDialog
      {...props}
      dialog={{
        title: texts.title,
        description: texts.description(routeCount),
        confirm: texts.confirm,
      }}
      field={texts}
      fieldId="close-place-reason"
    />
  );
}
