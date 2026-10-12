import { messages } from '@/messages/fr';
import type { AdminCounter, CountedAdminSection } from '@widoo/shared';

/**
 * A counter said in full: « 12 parcours à relire, dont 2 en retard ». Lateness is never told by
 * the red alone (wiki Ecrans › Admin web, Accessibilité).
 */
export function counterLabel(section: CountedAdminSection, counter: AdminCounter): string {
  const counted = messages.shell.counted[section](counter.count);
  return counter.lateCount > 0
    ? `${counted}${messages.shell.lateAmong(counter.lateCount)}`
    : counted;
}
