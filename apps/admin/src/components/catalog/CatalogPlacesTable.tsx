import type { CatalogPlaceColumn } from '@/config/catalog-places-list';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import { labels, type CatalogPlace } from '@widoo/shared';
import {
  SortableColumnHeader,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
  type SortDirection,
} from '@widoo/ui';
import { VerificationBadge } from './VerificationBadge';

type CatalogPlacesTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: CatalogPlace[];
  isLoading: boolean;
  sort: { column: CatalogPlaceColumn; direction: SortDirection };
  onSort: (column: CatalogPlaceColumn) => void;
  /** The place whose sheet is open in the detail panel. */
  openId: string | null;
  onOpen: (place: CatalogPlace) => void;
};

const texts = messages.catalog.places;
const columnCount = 6;

/** The places of the catalog as a table (A-04); a row opens its sheet next to the list. */
export function CatalogPlacesTable({
  items,
  isLoading,
  sort,
  onSort,
  openId,
  onOpen,
}: CatalogPlacesTableProps) {
  const renderSortableHeader = (column: CatalogPlaceColumn, label: string, className?: string) => {
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
          {renderSortableHeader('lieu', texts.columns.place)}
          {renderSortableHeader('categorie', texts.columns.category)}
          {renderSortableHeader('ville', texts.columns.city)}
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
          {renderSortableHeader('verifie', texts.columns.verified)}
          {renderSortableHeader('parcours', texts.columns.routes, 'text-right')}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((place) => (
            <TableRow key={place.id} onOpen={() => onOpen(place)} isOpen={place.id === openId}>
              <TableCell isStrong>{place.name}</TableCell>
              <TableCell>{labels.fr.placeCategories[place.category]}</TableCell>
              <TableCell>{place.cityName}</TableCell>
              <TableCell>
                <VerificationBadge status={place.verificationStatus} />
              </TableCell>
              <TableCell>
                {place.verifiedAt ? (
                  formatRelativeDate(new Date(place.verifiedAt))
                ) : (
                  <span className="text-muted-foreground">{texts.neverVerified}</span>
                )}
              </TableCell>
              <TableCell className="text-right">{place.routeCount}</TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
