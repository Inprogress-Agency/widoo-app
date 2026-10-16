import { formatSettingNumber } from '@/lib/setting-display';
import type { SettingFields } from '@/lib/setting-form';
import { messages } from '@/messages/fr';
import type { AdminSetting } from '@widoo/shared';
import { ConfirmDialog, Field, Input, Textarea } from '@widoo/ui';

const texts = messages.settings.edit;

type SettingEditDialogProps = {
  isOpen: boolean;
  setting: AdminSetting;
  fields: SettingFields;
  onFieldChange: (name: string, text: string) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/**
 * « Modifier » a setting: its value (one field, or one per weight) and the required reason kept
 * in the journal. The API holds the value to the bounds, which the window tells beforehand.
 */
export function SettingEditDialog({
  isOpen,
  setting,
  fields,
  onFieldChange,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isBusy,
}: SettingEditDialogProps) {
  const item = messages.settings.items[setting.key];
  const hint =
    setting.max === null
      ? texts.rangeFrom(formatSettingNumber(setting.min))
      : texts.range(formatSettingNumber(setting.min), formatSettingNumber(setting.max));
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={texts.title(item?.label ?? setting.key)}
      description={texts.description}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={texts.confirm}
      confirmVariant="primary"
      isBusy={isBusy}
    >
      {Object.keys(fields).map((name) => {
        const id = `setting-${name}`;
        return (
          <Field
            key={name}
            label={messages.settings.weights[name] ?? texts.value}
            htmlFor={id}
            isRequired
            hint={hint}
          >
            <Input
              id={id}
              required
              inputMode="decimal"
              aria-describedby={`${id}-hint`}
              value={fields[name] ?? ''}
              onChange={(event) => onFieldChange(name, event.target.value)}
            />
          </Field>
        );
      })}
      <Field label={texts.reason} htmlFor="setting-reason" isRequired hint={texts.reasonHint}>
        <Textarea
          id="setting-reason"
          required
          maxLength={500}
          aria-describedby="setting-reason-hint"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
