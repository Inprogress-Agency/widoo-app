import type { ProgramFormValues } from '@/lib/program-form';
import { messages } from '@/messages/fr';
import { Checkbox, ConfirmDialog, Field, Input } from '@widoo/ui';

const texts = messages.affiliation.programs.form;

type ProgramFormDialogProps = {
  isOpen: boolean;
  /** True when it changes a program; false when it adds one. */
  isEdit: boolean;
  values: ProgramFormValues;
  onChange: <Key extends keyof ProgramFormValues>(key: Key, value: ProgramFormValues[Key]) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Ajouter un programme » or « Modifier le programme »: its name, network, commission and cookie. */
export function ProgramFormDialog({
  isOpen,
  isEdit,
  values,
  onChange,
  onCancel,
  onConfirm,
  isBusy,
}: ProgramFormDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={isEdit ? texts.editTitle : texts.createTitle}
      description={texts.description}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={isEdit ? texts.save : texts.create}
      confirmVariant="primary"
      isBusy={isBusy}
    >
      <Field label={texts.name} htmlFor="program-name" isRequired>
        <Input
          id="program-name"
          required
          maxLength={100}
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </Field>
      <Field label={texts.network} htmlFor="program-network" isRequired hint={texts.networkHint}>
        <Input
          id="program-network"
          required
          maxLength={100}
          aria-describedby="program-network-hint"
          value={values.network}
          onChange={(event) => onChange('network', event.target.value)}
        />
      </Field>
      <Field label={texts.commission} htmlFor="program-commission" hint={texts.commissionHint}>
        <Input
          id="program-commission"
          maxLength={200}
          aria-describedby="program-commission-hint"
          value={values.commissionNote}
          onChange={(event) => onChange('commissionNote', event.target.value)}
        />
      </Field>
      <Field label={texts.cookieDays} htmlFor="program-cookie" isRequired hint={texts.cookieHint}>
        <Input
          id="program-cookie"
          required
          inputMode="numeric"
          aria-describedby="program-cookie-hint"
          value={values.cookieDays}
          onChange={(event) => onChange('cookieDays', event.target.value)}
        />
      </Field>
      <Checkbox
        label={texts.isActive}
        checked={values.isActive}
        onChange={(event) => onChange('isActive', event.target.checked)}
      />
    </ConfirmDialog>
  );
}
