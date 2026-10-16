import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { messages } from '@/messages/fr';
import type { BookableStep } from '@widoo/shared';
import { StatusBadge, Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.affiliation.steps;
const columnCount = 4;

type BookableStepsTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: BookableStep[];
  isLoading: boolean;
};

/** The host of a link, to show where it leads without the whole address. */
const hostOf = (url: string) => new URL(url).host;

/** The steps that can be booked as a table (A-09): the link shown, its origin and its clicks. */
export function BookableStepsTable({ items, isLoading }: BookableStepsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.route}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.place}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.link}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.clicks}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((step) => (
            <TableRow key={step.stepId}>
              <TableCell className="py-8">
                <span className="flex flex-col">
                  <span className="text-control">{step.route.title}</span>
                  <span className="text-label text-muted-foreground">
                    {texts.stepOf(step.position)}
                  </span>
                </span>
              </TableCell>
              <TableCell className="py-8">
                <span className="flex flex-col items-start gap-4">
                  <Link
                    href={`${catalogPaths.places}/${step.place.id}`}
                    className="text-blue-ink underline"
                  >
                    {step.place.name}
                  </Link>
                  <span className="text-label text-muted-foreground">
                    {step.place.hasPartnerLink ? texts.hasPartner : texts.addPartner}
                  </span>
                </span>
              </TableCell>
              <TableCell className="py-8">
                {step.link ? (
                  <span className="flex flex-col items-start gap-4">
                    <StatusBadge tone={step.link.origin === 'partner' ? 'info' : 'neutral'}>
                      {texts.origins[step.link.origin]}
                    </StatusBadge>
                    <span className="max-w-dialog truncate text-label text-muted-foreground">
                      {hostOf(step.link.url)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{texts.noLink}</span>
                )}
              </TableCell>
              <TableCell className="text-right">{step.clicks30Days}</TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
