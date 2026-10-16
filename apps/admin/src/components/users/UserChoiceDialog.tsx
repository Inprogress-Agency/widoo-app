import { messages } from '@/messages/fr';
import { ConfirmDialog, RadioGroup, type RadioOption } from '@widoo/ui';

type UserChoiceDialogProps = {
  isOpen: boolean;
  /** What the window says: its title, what the choice changes, and its button. */
  dialog: { title: string; description: string; confirm: string };
  /** Name of the radio group, and its question. */
  name: string;
  legend: string;
  options: readonly RadioOption[];
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** One choice among a few for an account (its role, the badge), confirmed in a window. */
export function UserChoiceDialog({
  isOpen,
  dialog,
  name,
  legend,
  options,
  value,
  onChange,
  onCancel,
  onConfirm,
  isBusy,
}: UserChoiceDialogProps) {
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
      <RadioGroup
        name={name}
        legend={legend}
        isRequired
        options={options}
        value={value}
        onChange={onChange}
      />
    </ConfirmDialog>
  );
}
