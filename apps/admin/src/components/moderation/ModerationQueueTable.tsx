import type { ModerationColumn } from '@/config/moderation-list';
import { formatDuration } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { HourglassIcon } from '@phosphor-icons/react/dist/ssr';
import type { ModerationQueueItem } from '@widoo/shared';
import {
  SortableColumnHeader,
  StatusBadge,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
  type SortDirection,
} from '@widoo/ui';
import { CertifiedSeal } from './CertifiedSeal';
import { WaitingTime } from './WaitingTime';
import { WarningCount } from './WarningCount';

type ModerationQueueTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: ModerationQueueItem[];
  isLoading: boolean;
  sort: { column: ModerationColumn; direction: SortDirection };
  onSort: (column: ModerationColumn) => void;
  /** True for a route that has been waiting for more than 72 hours. */
  isLate: (item: ModerationQueueItem) => boolean; /** Opens the moderation sheet of a route. */
  onOpen: (item: ModerationQueueItem) => void;
};

const texts = messages.moderation;
const columnCount = 7;

/** The moderation queue as a table (A-02): one route per row, sortable by five columns. */
export function ModerationQueueTable({
  items,
  isLoading,
  sort,
  onSort,
  isLate,
  onOpen,
}: ModerationQueueTableProps) {
  const renderSortableHeader = (column: ModerationColumn, label: string, className?: string) => {
    const direction = sort.column === column ? sort.direction : null;
    const ariaSort = direction === null ? 'none' : direction === 'asc' ? 'ascending' : 'descending';
    return (
      <TableHeaderCell aria-sort={ariaSort} className={className}>
        <SortableColumnHeader direction={direction} onSort={() => onSort(column)}>
          {label}
        </SortableColumnHeader>
      </TableHeaderCell>
    );
  };

  return (
    <Table>
      <thead>
        <tr>
          {renderSortableHeader('parcours', texts.columns.route)}
          {renderSortableHeader('auteur', texts.columns.author)}
          {renderSortableHeader('ville', texts.columns.city)}
          <TableHeaderCell>{texts.columns.content}</TableHeaderCell>
          {renderSortableHeader('alertes', texts.columns.warnings)}
          <TableHeaderCell>{texts.columns.unverified}</TableHeaderCell>
          {renderSortableHeader('file', texts.columns.waiting, 'text-right')}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((item) => (
            <TableRow key={item.id} onOpen={() => onOpen(item)}>
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{item.title}</span>
                  <span className="flex flex-wrap items-center gap-8 text-label text-muted-foreground">
                    {item.isRevision ? texts.revision : texts.firstSubmission}
                    {item.status === 'changes_requested' ? (
                      <StatusBadge
                        tone="neutral"
                        icon={<HourglassIcon aria-hidden className="size-16" />}
                      >
                        {texts.toFix}
                      </StatusBadge>
                    ) : null}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                {item.author ? (
                  <span className="inline-flex items-center gap-6">
                    {item.author.firstName}
                    {item.author.isCertified ? <CertifiedSeal /> : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{texts.noAuthor}</span>
                )}
              </TableCell>
              <TableCell>{item.cityName}</TableCell>
              <TableCell>
                {texts.content(
                  item.stepCount,
                  item.durationMin === null ? null : formatDuration(item.durationMin),
                )}
              </TableCell>
              <TableCell>
                <WarningCount count={item.warningCount} />
              </TableCell>
              <TableCell>
                {item.unverifiedPlaceCount > 0 ? (
                  texts.unverified(item.unverifiedPlaceCount)
                ) : (
                  <span className="text-muted-foreground">{texts.noUnverified}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <WaitingTime since={new Date(item.waitingSince)} isLate={isLate(item)} />
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
