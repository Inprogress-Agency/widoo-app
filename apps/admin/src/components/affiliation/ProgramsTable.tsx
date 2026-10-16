import { messages } from '@/messages/fr';
import type { AffiliateProgram } from '@widoo/shared';
import { StatusBadge, Table, TableCell, TableHeaderCell, TableRow, TableSkeleton } from '@widoo/ui';

const texts = messages.affiliation.programs;
const columnCount = 6;

type ProgramsTableProps = {
  /** The programs; ignored while `isLoading`. */
  items: AffiliateProgram[];
  isLoading: boolean;
  /** The program whose detail is open in the panel. */
  openId: string | null;
  onOpen: (program: AffiliateProgram) => void;
};

/** The affiliate programs as a table (A-09); a row opens its detail. */
export function ProgramsTable({ items, isLoading, openId, onOpen }: ProgramsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.program}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.network}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.commission}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.cookie}</TableHeaderCell>
          <TableHeaderCell className="text-right">{texts.columns.places}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.status}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeleton rows={6} columns={columnCount} label={messages.list.loading} />
        ) : (
          items.map((program) => (
            <TableRow
              key={program.id}
              onOpen={() => onOpen(program)}
              isOpen={program.id === openId}
            >
              <TableCell className="text-control">{program.name}</TableCell>
              <TableCell>{program.network}</TableCell>
              <TableCell>
                {program.commissionNote ?? (
                  <span className="text-muted-foreground">{texts.noCommission}</span>
                )}
              </TableCell>
              <TableCell className="text-right">{texts.cookieDays(program.cookieDays)}</TableCell>
              <TableCell className="text-right">{program.placeCount}</TableCell>
              <TableCell>
                <StatusBadge tone={program.isActive ? 'success' : 'neutral'}>
                  {program.isActive ? texts.status.active : texts.status.inactive}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}
