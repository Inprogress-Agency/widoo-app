import type { PlaceImportLine } from '@/lib/place-import';
import { messages } from '@/messages/fr';
import { Table, TableCell, TableHeaderCell, TableRow } from '@widoo/ui';
import { PlaceImportOutcomeBadge } from './PlaceImportOutcomeBadge';

const texts = messages.catalog.places.import;
const fieldLabels: Record<string, string> = texts.fields;

/** Why a line is set aside, or what happens to it, in a sentence. */
function explanationOf(line: PlaceImportLine): string {
  if (line.outcome === 'invalid') {
    const fields = line.fields.map((field) => fieldLabels[field] ?? texts.otherField);
    return texts.explanations.invalid([...new Set(fields)].join(', '));
  }
  if (line.outcome === 'duplicate') {
    return line.duplicateOf?.line
      ? texts.explanations.duplicateInFile(line.duplicateOf.line)
      : texts.explanations.duplicateInCatalog(line.duplicateOf?.name ?? line.name);
  }
  return texts.explanations[line.outcome];
}

/** The lines of an imported file, one per row: its number, its place, its outcome and why. */
export function PlaceImportTable({ lines }: { lines: PlaceImportLine[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>{texts.columns.line}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.place}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.outcome}</TableHeaderCell>
          <TableHeaderCell>{texts.columns.explanation}</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <TableRow key={line.line}>
            <TableCell>{line.line}</TableCell>
            <TableCell isStrong>
              {line.name || <span className="text-muted-foreground">{texts.noName}</span>}
            </TableCell>
            <TableCell>
              <PlaceImportOutcomeBadge outcome={line.outcome} />
            </TableCell>
            <TableCell>{explanationOf(line)}</TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
