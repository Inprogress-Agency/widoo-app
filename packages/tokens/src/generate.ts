import { readFile, writeFile } from 'node:fs/promises';
import { presetPath, themePath, tokensPath } from './paths';
import { renderPreset, renderThemeModule } from './render';
import { tokensSchema } from './schema';

/**
 * Writes the Tailwind preset and the typed theme module from `generated/tokens.json`.
 * `--check` writes nothing and fails when a generated file is not up to date (CI).
 */
async function generate(isCheck: boolean): Promise<void> {
  const tokens = tokensSchema.parse(JSON.parse(await readFile(tokensPath, 'utf8')));
  const outputs = [
    [presetPath, renderPreset(tokens)],
    [themePath, renderThemeModule(tokens)],
  ] as const;
  for (const [path, content] of outputs) {
    const current = await readFile(path, 'utf8').catch(() => undefined);
    if (current === content) {
      continue;
    }
    if (isCheck) {
      console.error(`${path} is not up to date: run \`pnpm --filter @widoo/tokens generate\`.`);
      process.exitCode = 1;
    } else {
      await writeFile(path, content);
      console.log(`${path}: written`);
    }
  }
}

await generate(process.argv.includes('--check'));
