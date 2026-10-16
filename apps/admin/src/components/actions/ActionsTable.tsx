import { actionLabelOf, targetNameOf, targetTypeLabelOf } from '@/lib/action-display';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminActionItem } from '@widoo/shared';
import { Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';

const texts = messages.actionLog;
const columnCount = 5;

type ActionsTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: AdminActionItem[];
  isLoading: boolean;
  /** The line whose detail is open in the panel. */
  openId: string | null;
  onOpen: (action: AdminActionItem) => void;
};

/** The journal of the admin as a table (A-12), most recent first; a row opens its detail. */
export function ActionsTable({ items, isLoading, openId, onOpen }: ActionsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.date}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.actor}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.action}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.target}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.reason}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((action) => (
            <TableRow key={action.id} onOpen={() => onOpen(action)} isOpen={action.id === openId}>
              <TableCell>{formatRelativeDate(new Date(action.createdAt))}</TableCell>
              <TableCell>
                {action.actor?.name ?? (
                  <span className="text-muted-foreground">{texts.unknownActor}</span>
                )}
              </TableCell>
              <TableCell>{actionLabelOf(action.action)}</TableCell>
              <TableCell>
                <span className="flex flex-col">
                  <span>{targetTypeLabelOf(action.targetType)}</span>
                  <span className="max-w-dialog truncate text-label text-muted-foreground">
                    {targetNameOf(action) ?? action.targetId}
                  </span>
                </span>
              </TableCell>
              <TableCell className="max-w-dialog truncate">{action.reason ?? ''}</TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
