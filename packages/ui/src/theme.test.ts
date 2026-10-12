import { createRequire } from 'node:module';
import resolveConfig from 'tailwindcss/resolveConfig';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const tokens = require('@widoo/tokens/tailwind-preset') as {
  theme: { colors: Record<string, string>; borderRadius: Record<string, string> };
};
const { shadcnColorTokens, shadcnRadiusToken } = require('../shadcn-theme.cjs') as {
  shadcnColorTokens: Record<string, string>;
  shadcnRadiusToken: string;
};
const preset = require('../tailwind-preset.cjs') as Parameters<typeof resolveConfig>[0];

describe('theme of shadcn/ui', () => {
  it.each(Object.entries(shadcnColorTokens))('reads --%s from the token %s', (_, token) => {
    expect(tokens.theme.colors[token]).toBeDefined();
  });

  // Wiki Ecrans › Admin web, « Thème shadcn/ui » (board validated on 2026-10-09, D-086).
  it('follows the validated board', () => {
    expect(shadcnColorTokens).toMatchObject({
      background: 'bg',
      foreground: 'ink',
      primary: 'blue',
      'primary-foreground': 'on-blue',
      secondary: 'surface',
      muted: 'surface',
      accent: 'surface',
      'muted-foreground': 'muted',
      destructive: 'error-ink',
      border: 'line',
      input: 'control-border',
      ring: 'ink',
      sidebar: 'surface',
      'sidebar-accent': 'bg',
      'sidebar-primary': 'blue',
    });
  });

  it('sets --radius to 12 px', () => {
    expect(tokens.theme.borderRadius[shadcnRadiusToken]).toBe('12px');
  });
});

describe('Tailwind preset', () => {
  const { theme } = resolveConfig({ content: [], presets: [preset] });
  const colors = theme.colors as unknown as Record<string, string>;

  it('names each shadcn color after its variable', () => {
    for (const variable of Object.keys(shadcnColorTokens)) {
      expect(colors[variable]).toBe(`var(--${variable})`);
    }
  });

  it('keeps the tokens of tokens.json', () => {
    expect(colors['blue-soft']).toBe(tokens.theme.colors['blue-soft']);
    expect(theme.borderRadius).toMatchObject(tokens.theme.borderRadius);
  });

  it('drops the default scale of Tailwind', () => {
    expect(colors['slate']).toBeUndefined();
    expect((theme.spacing as Record<string, string>)['5']).toBeUndefined();
  });
});
