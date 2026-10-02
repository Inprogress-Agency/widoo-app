/**
 * A legal text as `GET /legal/:doc` serves it (API › D-063): its version, its date, its title, the
 * sentences of « L'essentiel » when it has some (the policy), then its numbered articles.
 */
export type LegalText = {
  version: string;
  /** ISO date of the last change. */
  updatedAt: string;
  title: string;
  summary: string[];
  sections: { title: string; body: string }[];
};

/** A block of the body of an article: a paragraph, or a list (lines starting with « - »). */
export type LegalBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };
