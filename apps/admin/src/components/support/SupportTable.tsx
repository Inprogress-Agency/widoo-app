import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminSupportItem } from '@widoo/shared';
import { Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';
import { SupportStatusBadge } from './SupportStatusBadge';

const texts = messages.support;
const columnCount = 4;

type SupportTableProps = {
  /** The messages of the page; ignored while `isLoading`. */
  items: AdminSupportItem[];
  isLoading: boolean;
  /** The message whose card is open in the panel. */
  openId: string | null;
  onOpen: (message: AdminSupportItem) => void;
};

/** The messages of « Nous écrire » as a table (A-13): subject, account, date, status. */
export function SupportTable({ items, isLoading, openId, onOpen }: SupportTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.subject}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.account}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.date}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((message) => (
            <TableRow
              key={message.id}
              onOpen={() => onOpen(message)}
              isOpen={message.id === openId}
            >
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{messages.users.topics[message.topic]}</span>
                  <span className="text-label text-muted-foreground">{message.preview}</span>
                </span>
              </TableCell>
              <TableCell>
                {message.author ? (
                  (message.author.firstName ?? texts.unnamedAccount)
                ) : (
                  <span className="text-muted-foreground">{texts.noAccount}</span>
                )}
              </TableCell>
              <TableCell>{formatRelativeDate(new Date(message.createdAt))}</TableCell>
              <TableCell>
                <SupportStatusBadge isHandled={message.handledAt !== null} />
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
