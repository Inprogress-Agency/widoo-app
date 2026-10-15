/**
 * The Markdown of a legal article (`LegalSection.body`), as the app draws it natively: paragraphs
 * separated by a blank line, `- ` lists, tables and `**bold**`; nothing else exists in these texts.
 */

/** A run of text, bold or not. */
export interface Span {
  text: string;
  isBold: boolean;
}

/** A table row read as a card: each cell under the header of its column. */
export interface TableRow {
  cells: { header: string; value: Span[] }[];
}

export type Block =
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'list'; items: Span[][] }
  | { kind: 'table'; rows: TableRow[] };

/** `**bold**` runs; an unpaired `**` stays as written. */
export function spansOf(text: string): Span[] {
  const parts = text.split('**');
  if (parts.length % 2 === 0) {
    return [{ text, isBold: false }];
  }
  return parts
    .map((part, index) => ({ text: part, isBold: index % 2 === 1 }))
    .filter((span) => span.text !== '');
}

const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isTableRule = (line: string) => /^\|?\s*:?-{3,}/.test(line.trim());

function tableOf(lines: string[]): Block {
  const [head = '', ...rest] = lines;
  const headers = cellsOf(head);
  const rows = rest
    .filter((line) => !isTableRule(line))
    .map((line) => ({
      cells: cellsOf(line).map((value, index) => ({
        header: headers[index] ?? '',
        value: spansOf(value),
      })),
    }));
  return { kind: 'table', rows };
}

/** One block per paragraph, list or table, in order. */
export function blocksOf(body: string): Block[] {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split('\n').filter((line) => line.trim() !== ''))
    .filter((lines) => lines.length > 0)
    .map((lines): Block => {
      if (lines.every((line) => line.trim().startsWith('|'))) {
        return tableOf(lines);
      }
      if (lines.every((line) => line.trim().startsWith('- '))) {
        return { kind: 'list', items: lines.map((line) => spansOf(line.trim().slice(2))) };
      }
      return { kind: 'paragraph', spans: spansOf(lines.join(' ')) };
    });
}
