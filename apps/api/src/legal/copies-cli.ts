/**
 * `pnpm legal:copies`: writes the copies of the legal texts the app ships for a first opening
 * without network (`apps/mobile/src/legal/generated/`), as `GET /v1/legal/:doc?locale=fr` serves
 * them. Run after each new version of a text in `documents.ts`.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { legalDocs } from '@widoo/shared';
import { legalDocumentOf } from './documents';

for (const doc of legalDocs) {
  const path = fileURLToPath(
    new URL(`../../../mobile/src/legal/generated/${doc}.fr.json`, import.meta.url),
  );
  writeFileSync(path, `${JSON.stringify(legalDocumentOf(doc, 'fr'), null, 2)}\n`);
  console.info(`Legal copy written to ${path}`);
}
