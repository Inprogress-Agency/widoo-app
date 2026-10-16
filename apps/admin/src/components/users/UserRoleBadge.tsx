import { messages } from '@/messages/fr';
import type { UserRole } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';
import type { ComponentProps } from 'react';

type Tone = ComponentProps<typeof StatusBadge>['tone'];

/** A member of the team stands out from the users: admin in strong, the others in blue. */
const tones: Record<UserRole, Tone> = {
  user: 'neutral',
  editor: 'info',
  moderator: 'info',
  admin: 'strong',
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  return <StatusBadge tone={tones[role]}>{messages.users.roles[role]}</StatusBadge>;
}
