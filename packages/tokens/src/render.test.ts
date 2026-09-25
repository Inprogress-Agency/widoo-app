import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { presetPath, tokensPath } from './paths';
import { renderPreset } from './render';
import { tokensSchema } from './schema';
import { buildTheme } from './theme';

const tokens = tokensSchema.parse(JSON.parse(readFileSync(tokensPath, 'utf8')));
const theme = buildTheme(tokens);

describe('buildTheme', () => {
  it('keeps the light value of every color, never the dark one', () => {
    expect(Object.keys(theme.colors)).toHaveLength(tokens.color.tokens.length);
    for (const token of tokens.color.tokens) {
      expect(theme.colors[token.name]).toBe(token.value.light);
    }
    expect(theme.shadow['shadow-tabbar']).toBe('0 8px 24px rgba(20, 23, 31, 0.10)');
  });

  it('gives each of the 20 text styles the font file of its weight, spacing in points', () => {
    expect(Object.keys(theme.textStyles)).toHaveLength(20);
    expect(theme.textStyles['title-xl']).toEqual({
      fontFamily: 'PlusJakartaSans-800',
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.52,
    });
    expect(theme.textStyles['map-label']).toMatchObject({
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    });
    expect(theme.textStyles.body).toEqual({
      fontFamily: 'PlusJakartaSans-400',
      fontSize: 15,
      lineHeight: 22,
    });
  });
});

describe('renderPreset', () => {
  const preset = renderPreset(tokens, theme);

  it('replaces the scales of Tailwind with the tokens', () => {
    expect(preset).toContain('"blue-ink": "#3A4FA8"');
    expect(preset).toContain('"16": "16px"');
    expect(preset).toContain('"card": "18px"');
    expect(preset).toContain('"chip-h": "36px"');
    expect(preset).toContain('"fontSize": {}');
    expect(preset).not.toContain('extend');
  });
});

describe('generated preset', () => {
  it('is up to date with tokens.json (pnpm --filter @widoo/tokens generate)', () => {
    expect(readFileSync(presetPath, 'utf8')).toBe(renderPreset(tokens, theme));
  });

  it('says where it comes from', () => {
    const header = '// Généré depuis tokens.json (version 8), ne pas modifier';
    expect(readFileSync(presetPath, 'utf8').startsWith(header)).toBe(true);
  });
});
