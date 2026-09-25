import { fileURLToPath } from 'node:url';

/**
 * Copy of the wiki's `design/design-system/tokens.json`, written by `sync` only. It sits in
 * `generated/` with the files built from it: none of them is edited by hand.
 */
export const tokensPath = fileURLToPath(new URL('../generated/tokens.json', import.meta.url));

export const presetPath = fileURLToPath(
  new URL('../generated/tailwind-preset.cjs', import.meta.url),
);

export const themePath = fileURLToPath(new URL('../generated/theme.ts', import.meta.url));
