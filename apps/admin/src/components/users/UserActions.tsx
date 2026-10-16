import { messages } from '@/messages/fr';
import type { UserAction } from '@widoo/shared';
import { Button } from '@widoo/ui';

const texts = messages.users.actions;

export type UserActionName = Exclude<UserAction, 'suspend'> | 'suspend' | 'reactivate';

type UserActionsProps = {
  /** What the role of the member allows on this account (`allowedUserActions`). */
  allowed: readonly UserAction[];
  isSuspended: boolean;
  onAct: (action: UserActionName) => void;
  isBusy: boolean;
};

/** The actions of the card of an account (A-06): only the ones the role of the member allows. */
export function UserActions({ allowed, isSuspended, onAct, isBusy }: UserActionsProps) {
  const has = (action: UserAction) => allowed.includes(action);
  return (
    <>
      {has('suspend') ? (
        isSuspended ? (
          <Button onClick={() => onAct('reactivate')} disabled={isBusy}>
            {texts.reactivate}
          </Button>
        ) : (
          <Button variant="destructiveOutline" onClick={() => onAct('suspend')} disabled={isBusy}>
            {texts.suspend}
          </Button>
        )
      ) : null}
      {has('role') ? (
        <Button variant="secondary" onClick={() => onAct('role')} disabled={isBusy}>
          {texts.role}
        </Button>
      ) : null}
      {has('gift') ? (
        <Button variant="secondary" onClick={() => onAct('gift')} disabled={isBusy}>
          {texts.gift}
        </Button>
      ) : null}
      {has('certification') ? (
        <Button variant="secondary" onClick={() => onAct('certification')} disabled={isBusy}>
          {texts.certification}
        </Button>
      ) : null}
      {has('export') ? (
        <Button variant="outline" onClick={() => onAct('export')} disabled={isBusy}>
          {texts.export}
        </Button>
      ) : null}
      {has('delete') ? (
        <Button variant="destructiveOutline" onClick={() => onAct('delete')} disabled={isBusy}>
          {texts.delete}
        </Button>
      ) : null}
    </>
  );
}
