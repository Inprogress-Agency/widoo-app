import { monthlyPricePattern, type PartnerFormValues } from '@/lib/partner-form';
import { messages } from '@/messages/fr';
import { b2bClientStatuses, b2bClientTypes } from '@widoo/shared';
import { ConfirmDialog, Field, Input, Select, Textarea } from '@widoo/ui';

const texts = messages.b2b.form;

type PartnerFormDialogProps = {
  isOpen: boolean;
  /** True when it changes a partner; false when it registers one. */
  isEdit: boolean;
  values: PartnerFormValues;
  onChange: <Key extends keyof PartnerFormValues>(key: Key, value: PartnerFormValues[Key]) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Ajouter un partenaire » or « Modifier le partenaire »: its contact, contract and notes. */
export function PartnerFormDialog({
  isOpen,
  isEdit,
  values,
  onChange,
  onCancel,
  onConfirm,
  isBusy,
}: PartnerFormDialogProps) {
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
      <Field label={texts.name} htmlFor="partner-name" isRequired>
        <Input
          id="partner-name"
          required
          maxLength={100}
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </Field>
      <Field label={texts.slug} htmlFor="partner-slug" isRequired hint={texts.slugHint}>
        <Input
          id="partner-slug"
          required
          readOnly={isEdit}
          minLength={3}
          maxLength={60}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          aria-describedby="partner-slug-hint"
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
        />
      </Field>
      <Field label={texts.type} htmlFor="partner-type" isRequired>
        <Select
          id="partner-type"
          required
          value={values.type}
          onChange={(event) =>
            onChange('type', b2bClientTypes.find((type) => type === event.target.value) ?? 'other')
          }
        >
          {b2bClientTypes.map((type) => (
            <option key={type} value={type}>
              {messages.b2b.types[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={texts.status} htmlFor="partner-status" isRequired hint={texts.statusHint}>
        <Select
          id="partner-status"
          required
          aria-describedby="partner-status-hint"
          value={values.status}
          onChange={(event) =>
            onChange(
              'status',
              b2bClientStatuses.find((status) => status === event.target.value) ?? 'prospect',
            )
          }
        >
          {b2bClientStatuses.map((status) => (
            <option key={status} value={status}>
              {messages.b2b.statuses[status]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={texts.contactName} htmlFor="partner-contact-name">
        <Input
          id="partner-contact-name"
          maxLength={100}
          value={values.contactName}
          onChange={(event) => onChange('contactName', event.target.value)}
        />
      </Field>
      <Field label={texts.contactEmail} htmlFor="partner-contact-email">
        <Input
          id="partner-contact-email"
          type="email"
          maxLength={254}
          value={values.contactEmail}
          onChange={(event) => onChange('contactEmail', event.target.value)}
        />
      </Field>
      <Field label={texts.contactPhone} htmlFor="partner-contact-phone">
        <Input
          id="partner-contact-phone"
          type="tel"
          maxLength={30}
          value={values.contactPhone}
          onChange={(event) => onChange('contactPhone', event.target.value)}
        />
      </Field>
      <Field label={texts.address} htmlFor="partner-address">
        <Input
          id="partner-address"
          maxLength={300}
          value={values.address}
          onChange={(event) => onChange('address', event.target.value)}
        />
      </Field>
      <Field label={texts.price} htmlFor="partner-price" hint={texts.priceHint}>
        <Input
          id="partner-price"
          inputMode="decimal"
          pattern={monthlyPricePattern}
          aria-describedby="partner-price-hint"
          value={values.monthlyPrice}
          onChange={(event) => onChange('monthlyPrice', event.target.value)}
        />
      </Field>
      <Field label={texts.started} htmlFor="partner-started">
        <Input
          id="partner-started"
          type="date"
          value={values.startedAt}
          onChange={(event) => onChange('startedAt', event.target.value)}
        />
      </Field>
      <Field label={texts.notes} htmlFor="partner-notes">
        <Textarea
          id="partner-notes"
          maxLength={2000}
          value={values.notes}
          onChange={(event) => onChange('notes', event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
