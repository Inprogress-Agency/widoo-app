import { messages } from '@/messages/fr';
import { ConfirmDialog, Field, Input, RadioGroup } from '@widoo/ui';

const texts = messages.users.dialogs.gift;

export type GiftKind = 'until' | 'route';

type UserGiftDialogProps = {
  isOpen: boolean;
  userName: string;
  kind: GiftKind;
  onKindChange: (kind: GiftKind) => void;
  /** Last day of the Premium plan, `AAAA-MM-JJ`. */
  until: string;
  onUntilChange: (until: string) => void;
  /** First day that may be chosen: tomorrow. */
  minUntil: string;
  routeId: string;
  onRouteIdChange: (routeId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Offrir Premium »: until a date, or one Premium route, never both. */
export function UserGiftDialog({
  isOpen,
  userName,
  kind,
  onKindChange,
  until,
  onUntilChange,
  minUntil,
  routeId,
  onRouteIdChange,
  onCancel,
  onConfirm,
  isBusy,
}: UserGiftDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={texts.title}
      description={texts.description(userName)}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={texts.confirm}
      confirmVariant="primary"
      isBusy={isBusy}
    >
      <RadioGroup
        name="gift-kind"
        legend={texts.legend}
        options={[
          { value: 'until', label: texts.untilOption, description: texts.untilHint },
          { value: 'route', label: texts.routeOption, description: texts.routeHint },
        ]}
        value={kind}
        onChange={(value) => onKindChange(value === 'route' ? 'route' : 'until')}
      />
      {kind === 'until' ? (
        <Field label={texts.until} htmlFor="gift-until" isRequired>
          <Input
            id="gift-until"
            type="date"
            required
            min={minUntil}
            value={until}
            onChange={(event) => onUntilChange(event.target.value)}
          />
        </Field>
      ) : (
        <Field label={texts.route} htmlFor="gift-route" isRequired>
          <Input
            id="gift-route"
            required
            maxLength={36}
            value={routeId}
            onChange={(event) => onRouteIdChange(event.target.value.trim())}
          />
        </Field>
      )}
    </ConfirmDialog>
  );
}
