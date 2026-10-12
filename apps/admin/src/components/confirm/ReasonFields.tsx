import { messages } from '@/messages/fr';
import { Field, Select, Textarea } from '@widoo/ui';

export type ReasonOption = { code: string; label: string };

type ReasonFieldsProps = {
  /** Prefix of the `id` of the two controls, unique on the page. */
  id: string;
  /** The codified reasons of the action, in the order of the wiki. */
  options: readonly ReasonOption[];
  reasonCode: string;
  onReasonCodeChange: (code: string) => void;
  detail: string;
  onDetailChange: (detail: string) => void;
};

/**
 * The reason of a destructive action: a codified reason and its detail, both required (wiki
 * Admin-Web › Modèles communs). Goes inside a `ConfirmDialog`, whose form checks them.
 */
export function ReasonFields({
  id,
  options,
  reasonCode,
  onReasonCodeChange,
  detail,
  onDetailChange,
}: ReasonFieldsProps) {
  const texts = messages.confirm;
  return (
    <>
      <Field label={texts.reason} htmlFor={`${id}-reason`} isRequired>
        <Select
          id={`${id}-reason`}
          required
          value={reasonCode}
          onChange={(event) => onReasonCodeChange(event.target.value)}
        >
          <option value="" disabled>
            {texts.chooseReason}
          </option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={texts.detail} htmlFor={`${id}-detail`} isRequired hint={texts.detailHint}>
        <Textarea
          id={`${id}-detail`}
          required
          aria-describedby={`${id}-detail-hint`}
          value={detail}
          onChange={(event) => onDetailChange(event.target.value)}
        />
      </Field>
    </>
  );
}
