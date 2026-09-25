import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { tokensPath } from './paths';

const run = promisify(execFile);

/**
 * The wiki is the source of `tokens.json` (Direction-Artistique). It is read through git, which
 * needs no token: its raw URL serves a cached copy for minutes, while the automated sync runs
 * right after a wiki push (sync-tokens.yml) and CI must then see the same version.
 */
export const wikiGitUrl = 'https://github.com/Inprogress-Agency/widoo-app.wiki.git';
const wikiTokensFile = 'design/design-system/tokens.json';

/** Latest wiki copy, without downloading the rest of the wiki (images, bundles). */
async function readWikiTokens(): Promise<string> {
  const clone = await mkdtemp(join(tmpdir(), 'widoo-wiki-'));
  const options = { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } };
  try {
    await run(
      'git',
      ['clone', '--quiet', '--depth=1', '--filter=blob:none', '--no-checkout', wikiGitUrl, clone],
      options,
    );
    const { stdout } = await run('git', ['-C', clone, 'show', `HEAD:${wikiTokensFile}`], options);
    return stdout;
  } finally {
    await rm(clone, { recursive: true, force: true });
  }
}

/**
 * Keeps `generated/tokens.json` byte for byte identical to the wiki copy.
 * `--check` writes nothing and fails when they differ (CI).
 */
async function sync(isCheck: boolean): Promise<void> {
  const wiki = await readWikiTokens();
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
