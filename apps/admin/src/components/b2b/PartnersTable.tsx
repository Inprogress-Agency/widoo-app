import { citiesLabelOf, dayLabelOf, monthlyPriceLabelOf } from '@/lib/partner-display';
import { messages } from '@/messages/fr';
import type { B2bClientListItem } from '@widoo/shared';
import { Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';
import { PartnerStatusBadge } from './PartnerStatusBadge';

const texts = messages.b2b;
const columnCount = 7;

type PartnersTableProps = {
  /** The partners; ignored while `isLoading`. */
  items: B2bClientListItem[];
  isLoading: boolean;
  /** The partner whose card is open in the panel. */
  openId: string | null;
  onOpen: (partner: B2bClientListItem) => void;
};

/** The B2B partners as a table (A-10); a row opens its card. */
export function PartnersTable({ items, isLoading, openId, onOpen }: PartnersTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.partner}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.type}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.city}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.price}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.started}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.routes}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={6} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((partner) => (
            <TableRow
              key={partner.id}
              onOpen={() => onOpen(partner)}
              isOpen={partner.id === openId}
            >
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{partner.name}</span>
                  <span className="text-label text-muted-foreground">{partner.slug}</span>
                </span>
              </TableCell>
              <TableCell>{texts.types[partner.type]}</TableCell>
              <TableCell>
                {citiesLabelOf(partner.cityNames) ?? (
                  <span className="text-muted-foreground">{texts.noValue}</span>
                )}
              </TableCell>
              <TableCell>
                <PartnerStatusBadge status={partner.status} />
              </TableCell>
              <TableCell className="text-right">
                {monthlyPriceLabelOf(partner.monthlyPriceCents) ?? (
                  <span className="text-muted-foreground">{texts.noValue}</span>
                )}
              </TableCell>
              <TableCell>
                {dayLabelOf(partner.startedAt) ?? (
                  <span className="text-muted-foreground">{texts.noValue}</span>
                )}
              </TableCell>
              <TableCell className="text-right">{partner.routeCount}</TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
