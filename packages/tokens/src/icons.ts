import { createRequire } from 'node:module';

// Icon map of the app, generated from `iconNames` (#149): an icon added to the wiki mappings
// reaches the app with the tokens sync, without a list kept by hand in apps/mobile.

const require = createRequire(import.meta.url);

/** `arrow-square-out` → `ArrowSquareOut`, the file and component name in Phosphor. */
export function phosphorName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** One import per icon: the package root would bundle the 1,500 icons of Phosphor. */
export function phosphorModule(name: string): string {
  return `phosphor-react-native/src/icons/${phosphorName(name)}`;
}

/** Names of `iconNames` that Phosphor does not have, spelled differently or unknown. */
export function missingPhosphorIcons(iconNames: readonly string[]): string[] {
  return iconNames.filter((name) => {
    try {
      require.resolve(phosphorModule(name));
      return false;
    } catch {
      return true;
    }
  });
}

const key = (name: string) => (/^[a-z][a-zA-Z0-9]*$/.test(name) ? name : `'${name}'`);

/** Typed module that gives the Phosphor component of every icon of `iconNames`. */
export function renderIconsModule(header: string, iconNames: readonly string[]): string {
  const imports = iconNames.map(
    (name) => `import { ${phosphorName(name)}Icon } from '${phosphorModule(name)}';`,
  );
  const entries = iconNames.map((name) => `  ${key(name)}: ${phosphorName(name)}Icon,`);
  return `${header}
import type { Icon } from 'phosphor-react-native';
${imports.join('\n')}
import type { IconName } from './theme';

/** Phosphor component of every icon named by tokens.json, one import each. */
export const icons: Record<IconName, Icon> = {
${entries.join('\n')}
};
`;
}
