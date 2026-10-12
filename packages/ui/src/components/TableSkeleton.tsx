import { TableCell, TableRow } from './Table';

type TableSkeletonProps = {
  /** Rows to draw while the list loads. */
  rows: number;
  /** Columns of the table. */
  columns: number;
  /** What a screen reader says once, instead of every gray bar: « Chargement de la liste ». */
  label: string;
};

/** Loading state of a table: gray bars in place of the rows, inside its `tbody`. */
export function TableSkeleton({ rows, columns, label }: TableSkeletonProps) {
  return (
    <>
      <tr className="sr-only">
        <td colSpan={columns} role="status">
          {label}
        </td>
      </tr>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} aria-hidden>
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column}>
              <span className="block h-12 w-full animate-pulse rounded-pill bg-skeleton" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
