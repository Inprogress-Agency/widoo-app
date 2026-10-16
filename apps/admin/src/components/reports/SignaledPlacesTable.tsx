import { VerificationBadge } from '@/components/catalog/VerificationBadge';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminSignaledPlace } from '@widoo/shared';
import { Button, Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.reports.places;
const columnCount = 6;

type SignaledPlacesTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: AdminSignaledPlace[];
  isLoading: boolean;
  /** Address of the form of a place; absent for a role that does not edit the catalog. */
  editPathOf?: (placeId: string) => string;
  onVerify: (place: AdminSignaledPlace) => void;
  onClose: (place: AdminSignaledPlace) => void;
  isBusy: boolean;
};

/** The places the community flagged (A-03), each with the actions that settle it. */
export function SignaledPlacesTable({
  items,
  isLoading,
  editPathOf,
  onVerify,
  onClose,
  isBusy,
}: SignaledPlacesTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.place}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.signals}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.routes}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.verified}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">{messages.reports.routes.panel.openRoute}</span>
          </TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={6} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((place) => (
            <TableRow key={place.id}>
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{place.name}</span>
                  <span className="text-label text-muted-foreground">
                    {place.address}, {place.cityName}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <VerificationBadge status={place.verificationStatus} />
              </TableCell>
              <TableCell className="text-right">{place.signalCount}</TableCell>
              <TableCell className="py-8">
                {place.routes.length === 0 ? (
                  <span className="text-muted-foreground">{texts.noRoute}</span>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {place.routes.map((route) => (
                      <li key={route.id}>{route.title}</li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell>
                {place.verifiedAt ? (
                  formatRelativeDate(new Date(place.verifiedAt))
                ) : (
                  <span className="text-muted-foreground">{texts.neverVerified}</span>
                )}
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap justify-end gap-8">
                  <Button size="small" onClick={() => onVerify(place)} disabled={isBusy}>
                    {texts.actions.verify}
                  </Button>
                  {editPathOf ? (
                    <Button asChild size="small" variant="outline">
                      <Link href={editPathOf(place.id)}>{texts.actions.fix}</Link>
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    variant="destructiveOutline"
                    onClick={() => onClose(place)}
                    disabled={isBusy}
                  >
                    {texts.actions.close}
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
