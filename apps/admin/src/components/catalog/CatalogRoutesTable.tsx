import { RouteStatusBadge } from '@/components/routes/RouteStatusBadge';
import type { CatalogRouteColumn } from '@/config/catalog-routes-list';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { CatalogRoute } from '@widoo/shared';
import {
  SortableColumnHeader,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
  type SortDirection,
} from '@widoo/ui';

type CatalogRoutesTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: CatalogRoute[];
  isLoading: boolean;
  sort: { column: CatalogRouteColumn; direction: SortDirection };
  onSort: (column: CatalogRouteColumn) => void;
  /** Opens the sheet of a route; absent for a role that only reads the list. */
  onOpen?: (route: CatalogRoute) => void;
};

const texts = messages.catalog.routes;
const columnCount = 7;

/** The routes of the catalog as a table (A-04): one route per row, whatever its status. */
export function CatalogRoutesTable({
  items,
  isLoading,
  sort,
  onSort,
  onOpen,
}: CatalogRoutesTableProps) {
  const renderSortableHeader = (column: CatalogRouteColumn, label: string, className?: string) => {
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
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.access}</TableHeaderCell>
          {renderSortableHeader('note', texts.columns.rating)}
          {renderSortableHeader('modifie', texts.columns.updated, 'text-right')}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((route) => (
            <TableRow key={route.id} onOpen={onOpen ? () => onOpen(route) : undefined}>
              <TableCell isStrong>{route.title}</TableCell>
              <TableCell>
                {route.author?.firstName ??
                  (route.isOfficial ? texts.team : messages.moderation.noAuthor)}
              </TableCell>
              <TableCell>{route.cityName}</TableCell>
              <TableCell>
                <RouteStatusBadge status={route.status} />
              </TableCell>
              <TableCell>{texts.access[route.access]}</TableCell>
              <TableCell>
                {route.rating.average === null ? (
                  <span className="text-muted-foreground">{texts.noRating}</span>
                ) : (
                  texts.rating(route.rating.average, route.rating.count)
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatRelativeDate(new Date(route.updatedAt))}
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
