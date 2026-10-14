import { messages } from '@/messages/fr';
import { Field, RadioGroup, Select, Textarea } from '@widoo/ui';

export type ReasonOption = { code: string; label: string; description?: string };

type ReasonFieldsProps = {
  /** Prefix of the `id` of the two controls, unique on the page. */
  id: string;
  /** The codified reasons of the action, in the order of the wiki. */
  options: readonly ReasonOption[];
  reasonCode: string;
  onReasonCodeChange: (code: string) => void;
  detail: string;
  onDetailChange: (detail: string) => void;
  /** Label and help of the detail when it is not a note for the team: a message to an author. */
  detailLabel?: string;
  detailHint?: string;
  /** Shown instead of the hint when the detail is refused (empty). */
  detailError?: string;
  detailPlaceholder?: string;
  /**
   * `select` (default): a list of the reasons. `radios`: every reason on view with its
   * explanation, for the few reasons an author reads (the refusal of a route).
   */
  reasonLayout?: 'select' | 'radios';
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
  detailLabel = messages.confirm.detail,
  detailHint = messages.confirm.detailHint,
  detailError,
  detailPlaceholder,
  reasonLayout = 'select',
}: ReasonFieldsProps) {
  const texts = messages.confirm;
  return (
    <>
      {reasonLayout === 'radios' ? (
        <RadioGroup
          name={`${id}-reason`}
          legend={texts.reason}
          isRequired
          options={options.map(({ code, label, description }) => ({
            value: code,
            label,
            description,
          }))}
          value={reasonCode}
          onChange={onReasonCodeChange}
        />
      ) : (
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
      )}
      <Field
        label={detailLabel}
        htmlFor={`${id}-detail`}
        isRequired
        hint={detailHint}
        error={detailError}
      >
        <Textarea
          id={`${id}-detail`}
          // A refused empty detail is told by the field itself, not by the bubble of the browser.
          required={detailError === undefined && reasonLayout === 'select'}
          maxLength={1000}
          placeholder={detailPlaceholder}
          aria-invalid={detailError ? true : undefined}
          aria-describedby={`${id}-detail-hint`}
          value={detail}
          onChange={(event) => onDetailChange(event.target.value)}
        />
      </Field>
    </>
  );
}
