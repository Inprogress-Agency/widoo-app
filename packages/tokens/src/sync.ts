import { readFile, writeFile } from 'node:fs/promises';
import { tokensPath } from './paths';

/** The wiki is the source of `tokens.json` (Direction-Artistique); its raw URL needs no token. */
export const wikiTokensUrl =
  'https://raw.githubusercontent.com/wiki/Inprogress-Agency/widoo-app/design/design-system/tokens.json';

/**
 * Keeps `generated/tokens.json` byte for byte identical to the wiki copy.
 * `--check` writes nothing and fails when they differ (CI).
 */
async function sync(isCheck: boolean): Promise<void> {
  const response = await fetch(wikiTokensUrl);
  if (!response.ok) {
    throw new Error(`GET ${wikiTokensUrl}: HTTP ${response.status}`);
  }
  const wiki = await response.text();
  const local = await readFile(tokensPath, 'utf8').catch(() => undefined);
  if (local === wiki) {
    console.log('tokens.json: identical to the wiki');
    return;
  }
  if (isCheck) {
    console.error(
      'tokens.json differs from the wiki: run `pnpm --filter @widoo/tokens sync`, then `generate`, and commit both.',
    );
    process.exitCode = 1;
    return;
  }
  await writeFile(tokensPath, wiki);
  console.log('tokens.json: copied from the wiki, run `pnpm --filter @widoo/tokens generate`');
}

await sync(process.argv.includes('--check'));
