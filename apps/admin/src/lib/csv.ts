/** A row of a CSV file: its cells, and the line of the file it starts on (1 for the first). */
export type CsvRow = { line: number; cells: string[] };

/**
 * The text of a CSV file, whatever saved it: UTF-8, or the Windows-1252 a spreadsheet writes
 * when UTF-8 is not asked for. Without the byte order mark.
 */
export function decodeCsv(bytes: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return text.replace(/^\uFEFF/, '');
}

/** The separator of a file, read on its first line: a spreadsheet in French writes `;`. */
function delimiterOf(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
}

/**
 * Rows of a CSV text. Cells are trimmed; a cell in double quotes keeps its separators and line
 * breaks, and `""` is a quote. Empty lines are skipped, and keep their number.
 */
export function parseCsv(text: string): CsvRow[] {
  const delimiter = delimiterOf(text);
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let isQuoted = false;
  let line = 1;
  let rowLine = 1;

  const endCell = () => {
    cells.push(cell.trim());
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (cells.some((value) => value !== '')) {
      rows.push({ line: rowLine, cells });
    }
    cells = [];
    rowLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (isQuoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        cell += character;
        line += character === '\n' ? 1 : 0;
      }
    } else if (character === '"') {
      isQuoted = true;
    } else if (character === delimiter) {
      endCell();
    } else if (character === '\n') {
      endRow();
      line += 1;
    } else if (character !== '\r') {
      cell += character;
    }
  }
  endRow();
  return rows;
}
