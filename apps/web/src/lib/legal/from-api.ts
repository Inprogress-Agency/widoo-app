import type { LegalBlock, LegalText } from './types';

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * The answer of `GET /legal/:doc`, checked field by field: anything missing or of the wrong type
 * and the text is not shown (the page is missing), never half shown. `summary` may be absent, a
 * sentence or a list of sentences.
 */
export function toLegalText(body: unknown): LegalText | null {
  if (typeof body !== 'object' || body === null) return null;
  const { version, updatedAt, title, summary, sections } = body as Record<string, unknown>;
  if (!isText(version) || !isText(title) || !isText(updatedAt)) return null;
  if (Number.isNaN(Date.parse(updatedAt)) || !Array.isArray(sections) || sections.length === 0) {
    return null;
  }
  const articles = sections.map((section: unknown) => {
    if (typeof section !== 'object' || section === null) return null;
    const { title: name, body: text } = section as Record<string, unknown>;
    return isText(name) && isText(text) ? { title: name, body: text } : null;
  });
  if (articles.some((article) => article === null)) return null;

  let sentences: string[] = [];
  if (isText(summary)) sentences = [summary];
  else if (Array.isArray(summary)) sentences = summary.filter(isText);
  else if (summary !== undefined && summary !== null) return null;

  return {
    version,
    updatedAt,
    title,
    summary: sentences,
    sections: articles as LegalText['sections'],
  };
}

/** The body of an article in blocks: paragraphs split by a blank line, lists of « - » lines. */
export function toLegalBlocks(body: string): LegalBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): LegalBlock => {
      const lines = chunk.split('\n').map((line) => line.trim());
      return lines.every((line) => line.startsWith('- '))
        ? { kind: 'list', items: lines.map((line) => line.slice(2).trim()) }
        : { kind: 'paragraph', text: lines.join(' ') };
    });
}
