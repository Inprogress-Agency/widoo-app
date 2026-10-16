import { messages } from '@/messages/fr';
import type { AdminUserListItem, AdminUserPlan } from '@widoo/shared';
import { formatDayMonth } from './dates';

const texts = messages.users;

/** How a row or a dialog names an account: first name, else the address, else a placeholder. */
export function userNameOf(user: Pick<AdminUserListItem, 'firstName' | 'email'>): string {
  return user.firstName ?? user.email ?? texts.noFirstName;
}

/**
 * The formula of an account as the list reads it: « Gratuit », « Abonnement ou pass, jusqu'au
 * 2 octobre », « Offert, jusqu'au 2 octobre ». An end date in the past reads as ended.
 */
export function planLabelOf(plan: AdminUserPlan, now = new Date()): string {
  if (plan.plan === 'free') {
    return texts.plan.free;
  }
  const name = texts.plan[plan.source];
  if (plan.expiresAt === null) {
    return `${name}, ${texts.plan.noEnd}`;
  }
  const end = new Date(plan.expiresAt);
  return end.getTime() > now.getTime()
    ? `${name}, ${texts.plan.until(formatDayMonth(end))}`
    : `${name}, ${texts.plan.ended}`;
}
