import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { missingPhosphorIcons, phosphorModule, phosphorName, renderIconsModule } from './icons';
import { buildMappings } from './mappings';
import { tokensPath } from './paths';
import { tokensSchema } from './schema';
import { buildTheme } from './theme';

const tokens = tokensSchema.parse(JSON.parse(readFileSync(tokensPath, 'utf8')));
const { iconNames } = buildMappings(tokens.mappings, buildTheme(tokens));

describe('phosphorName', () => {
  it.each([
    ['x', 'X'],
    ['tag', 'Tag'],
    ['caret-down', 'CaretDown'],
    ['arrow-square-out', 'ArrowSquareOut'],
    ['clock-counter-clockwise', 'ClockCounterClockwise'],
  ])('turns %s into %s', (name, component) => {
    expect(phosphorName(name)).toBe(component);
  });
});

describe('Phosphor modules', () => {
  it('exist for every icon of tokens.json', () => {
    expect(
      missingPhosphorIcons(iconNames),
      'Phosphor has no icon of this name: correct it in mappings of the wiki tokens.json (phosphoricons.com)',
    ).toEqual([]);
  });

  it('are reported missing for a name Phosphor does not have', () => {
    expect(missingPhosphorIcons(['heart', 'widoo-ribbon', 'hearts'])).toEqual([
      'widoo-ribbon',
      'hearts',
    ]);
  });
});

describe('renderIconsModule', () => {
  const module = renderIconsModule('// header', ['x', 'caret-down']);

  it('imports each icon from its own Phosphor file, never from the package root', () => {
    expect(module).toContain(`import { XIcon } from '${phosphorModule('x')}';`);
    expect(module).toContain(
      "import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';",
    );
    expect(module).not.toMatch(/import \{ \w+Icon \} from 'phosphor-react-native';/);
  });

  it('keys the map by icon name, typed by IconName', () => {
    expect(module).toContain('export const icons: Record<IconName, Icon> = {');
    expect(module).toContain('  x: XIcon,\n');
    expect(module).toContain("  'caret-down': CaretDownIcon,\n");
  });
});
