import { sectionIcons } from '@/components/shell/section-icons';
import { formatWaitingTime } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { countedAdminSections, type AdminStats, type CountedAdminSection } from '@widoo/shared';
import { ToHandleTile } from './ToHandleTile';

const texts = messages.dashboard.toHandle;

type ToHandleTilesProps = {
  /** What waits in each section the role opens; a section the role does not open is absent. */
  toHandle: AdminStats['toHandle'];
  /** The list each tile opens, already filtered on what waits. */
  hrefs: Record<CountedAdminSection, string>;
};

/**
 * The tiles « à traiter » of the dashboard, in the order of the navigation: one per section of
 * the role, with its count, and since when its oldest item waits.
 */
export function ToHandleTiles({ toHandle, hrefs }: ToHandleTilesProps) {
  const sections = countedAdminSections.filter((section) => toHandle[section] !== undefined);
  if (sections.length === 0) {
    return <p className="text-body-s text-muted-foreground">{texts.nothing}</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      {sections.map((section) => {
        const waiting = toHandle[section];
        if (!waiting) {
          return null;
        }
        return (
          <li key={section}>
            <ToHandleTile
              href={hrefs[section]}
              icon={sectionIcons[section]}
              label={texts.tiles[section].label}
              count={waiting.count}
              detail={
                waiting.oldestSince
                  ? texts.oldest(formatWaitingTime(new Date(waiting.oldestSince)))
                  : texts.tiles[section].none
              }
              isLate={waiting.lateCount > 0}
            />
          </li>
        );
      })}
    </ul>
  );
}
