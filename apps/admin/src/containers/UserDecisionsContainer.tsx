'use client';

import { UserActions, type UserActionName } from '@/components/users/UserActions';
import { UserChoiceDialog } from '@/components/users/UserChoiceDialog';
import { UserGiftDialog, type GiftKind } from '@/components/users/UserGiftDialog';
import { UserReasonDialog } from '@/components/users/UserReasonDialog';
import { ConfirmDialog } from '@widoo/ui';
import { useSession } from '@/hooks/useSession';
import { useUserActions } from '@/hooks/useUserActions';
import { earliestGiftDay, endOfGiftDay } from '@/lib/gift-date';
import { userNameOf } from '@/lib/user-display';
import { messages } from '@/messages/fr';
import {
  allowedUserActions,
  certifiedOverrides,
  type AdminUserDetail,
  type CertifiedOverride,
  type UserRole,
} from '@widoo/shared';
import { useState } from 'react';

const texts = messages.users.dialogs;

const roleOptions = (Object.keys(messages.users.roles) as UserRole[]).map((role) => ({
  value: role,
  label: messages.users.roles[role],
}));
const certificationOptions = certifiedOverrides.map((override) => ({
  value: override,
  label: texts.certification.options[override],
}));
const isRole = (value: string): value is UserRole => value in messages.users.roles;
const isOverride = (value: string): value is CertifiedOverride =>
  (certifiedOverrides as readonly string[]).includes(value);

type UserDecisionsContainerProps = {
  user: AdminUserDetail;
  /** An action is done: the list and the card read again. */
  onSettled: () => void;
  /** The account is deleted: the card closes. */
  onDeleted: () => void;
};

/**
 * The actions on one account (A-06): the buttons the role of the member allows, and the window
 * each one opens (a reason, a choice, a date). The API checks the role again on every write.
 */
export function UserDecisionsContainer({
  user,
  onSettled,
  onDeleted,
}: UserDecisionsContainerProps) {
  const { session } = useSession();
  const [openAction, setOpenAction] = useState<UserActionName | null>(null);
  const [reason, setReason] = useState('');
  const [role, setRole] = useState<string>(user.role);
  const [override, setOverride] = useState<string>(user.certification.override);
  const [giftKind, setGiftKind] = useState<GiftKind>('until');
  const [giftUntil, setGiftUntil] = useState('');
  const [giftRouteId, setGiftRouteId] = useState('');
  const close = () => setOpenAction(null);
  const actions = useUserActions(
    user.id,
    () => {
      close();
      onSettled();
    },
    () => {
      close();
      onDeleted();
    },
  );
  const member = session.status === 'signedIn' ? session.member : null;
  const allowed = member ? allowedUserActions(member, user) : [];
  const name = userNameOf(user);

  const handleAct = (action: UserActionName) => {
    if (action === 'export') {
      void actions.exportData();
      return;
    }
    setReason('');
    setRole(user.role);
    setOverride(user.certification.override);
    setGiftKind('until');
    setGiftUntil('');
    setGiftRouteId('');
    setOpenAction(action);
  };
  const reasonDialog = (action: 'suspend' | 'reactivate') => ({
    isOpen: openAction === action,
    dialog: { ...texts[action], description: texts[action].description(name) },
    isDestructive: action === 'suspend',
    reason,
    onReasonChange: setReason,
    onCancel: close,
    onConfirm: () => void actions[action](reason.trim()),
    isBusy: actions.isBusy,
  });

  return (
    <>
      <UserActions
        allowed={allowed}
        isSuspended={user.suspendedAt !== null}
        onAct={handleAct}
        isBusy={actions.isBusy}
      />
      <UserReasonDialog {...reasonDialog('suspend')} />
      <UserReasonDialog {...reasonDialog('reactivate')} />
      <UserChoiceDialog
        isOpen={openAction === 'role'}
        dialog={{ ...texts.role, description: texts.role.description(name) }}
        name="user-role"
        legend={texts.role.legend}
        options={roleOptions}
        value={role}
        onChange={setRole}
        onCancel={close}
        onConfirm={() => isRole(role) && void actions.changeRole(role)}
        isBusy={actions.isBusy}
      />
      <UserChoiceDialog
        isOpen={openAction === 'certification'}
        dialog={{ ...texts.certification, description: texts.certification.description(name) }}
        name="user-certification"
        legend={texts.certification.legend}
        options={certificationOptions}
        value={override}
        onChange={setOverride}
        onCancel={close}
        onConfirm={() => isOverride(override) && void actions.setCertification(override)}
        isBusy={actions.isBusy}
      />
      <UserGiftDialog
        isOpen={openAction === 'gift'}
        userName={name}
        kind={giftKind}
        onKindChange={setGiftKind}
        until={giftUntil}
        onUntilChange={setGiftUntil}
        minUntil={earliestGiftDay()}
        routeId={giftRouteId}
        onRouteIdChange={setGiftRouteId}
        onCancel={close}
        onConfirm={() =>
          void actions.gift(
            giftKind === 'until' ? { until: endOfGiftDay(giftUntil) } : { routeId: giftRouteId },
          )
        }
        isBusy={actions.isBusy}
      />
      <ConfirmDialog
        isOpen={openAction === 'delete'}
        onCancel={close}
        onConfirm={() => void actions.remove()}
        title={texts.delete.title}
        description={texts.delete.description(name)}
        cancelLabel={messages.confirm.cancel}
        closeLabel={messages.confirm.close}
        confirmLabel={texts.delete.confirm}
        isBusy={actions.isBusy}
      />
    </>
  );
}
