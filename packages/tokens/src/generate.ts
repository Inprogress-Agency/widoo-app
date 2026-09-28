import { readFile, writeFile } from 'node:fs/promises';
import { renderIconsModule } from './icons';
import { buildMappings } from './mappings';
import { iconsPath, presetPath, themePath, tokensPath } from './paths';
import { header, renderPreset, renderThemeModule } from './render';
import { tokensSchema } from './schema';
import { buildTheme } from './theme';

/**
 * Writes the Tailwind preset, the typed theme module and the icon map from `generated/tokens.json`.
 * `--check` writes nothing and fails when a generated file is not up to date (CI).
 */
async function generate(isCheck: boolean): Promise<void> {
  const tokens = tokensSchema.parse(JSON.parse(await readFile(tokensPath, 'utf8')));
  const theme = buildTheme(tokens);
  const { iconNames } = buildMappings(tokens.mappings, theme);
  const outputs = [
    [presetPath, renderPreset(tokens, theme)],
    [themePath, renderThemeModule(tokens, theme)],
    [iconsPath, renderIconsModule(header(tokens.version), iconNames)],
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
