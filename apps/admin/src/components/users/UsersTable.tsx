import { planLabelOf, userNameOf } from '@/lib/user-display';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminUserListItem } from '@widoo/shared';
import { Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';

const texts = messages.users;
const columnCount = 6;

type UsersTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: AdminUserListItem[];
  isLoading: boolean;
  /** The account whose card is open in the detail panel. */
  openId: string | null;
  onOpen: (user: AdminUserListItem) => void;
};

/** The accounts as a table (A-06); a row opens the card of the account. */
export function UsersTable({ items, isLoading, openId, onOpen }: UsersTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.user}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.role}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.plan}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.routes}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.joined}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((user) => (
            <TableRow key={user.id} onOpen={() => onOpen(user)} isOpen={user.id === openId}>
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{userNameOf(user)}</span>
                  <span className="text-label text-muted-foreground">
                    {user.email ?? texts.noEmail}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <UserRoleBadge role={user.role} />
              </TableCell>
              <TableCell>{planLabelOf(user.plan)}</TableCell>
              <TableCell className="text-right">{user.createdRouteCount}</TableCell>
              <TableCell>{formatRelativeDate(new Date(user.createdAt))}</TableCell>
              <TableCell>
                <UserStatusBadge isSuspended={user.suspendedAt !== null} />
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
