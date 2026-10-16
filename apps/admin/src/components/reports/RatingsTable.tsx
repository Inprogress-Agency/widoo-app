import { StarIcon } from '@phosphor-icons/react/dist/ssr';
import { formatRelativeDate } from '@/lib/dates';
import { messages } from '@/messages/fr';
import type { AdminRating } from '@widoo/shared';
import { StatusBadge, Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';

const texts = messages.reports.ratings;
const columnCount = 5;

type RatingsTableProps = {
  /** Rows of the page; ignored while `isLoading`. */
  items: AdminRating[];
  isLoading: boolean;
};

/** The ratings with a comment as a table (A-03): the note, the comment, the route and its author. */
export function RatingsTable({ items, isLoading }: RatingsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.rating}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.comment}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.route}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.author}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.date}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((rating) => (
            <TableRow key={rating.id}>
              <TableCell>
                <span className="inline-flex items-center gap-4 text-control">
                  <StarIcon aria-hidden weight="fill" className="size-16" />
                  {rating.rating}
                </span>
              </TableCell>
              <TableCell className="py-8">
                <span className="flex flex-col items-start gap-4">
                  {rating.comment}
                  {rating.isHidden ? (
                    <StatusBadge tone="neutral">{texts.hidden}</StatusBadge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>{rating.route.title}</TableCell>
              <TableCell>
                {rating.author ? (
                  (rating.author.firstName ?? '')
                ) : (
                  <span className="text-muted-foreground">{texts.unknownAuthor}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatRelativeDate(new Date(rating.createdAt))}
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
