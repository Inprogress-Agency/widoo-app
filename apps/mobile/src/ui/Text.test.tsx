import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { accessibility, textStyles, type TextStyleToken } from '@widoo/tokens';
import { Text } from './Text';

const variants = Object.keys(textStyles) as TextStyleToken[];
const isTitle = (variant: TextStyleToken) =>
  textStyles[variant].fontSize >= accessibility.titleMinFontSize;
const titles = variants.filter(isTitle);
const others = variants.filter((variant) => !isTitle(variant));

async function multiplierOf(variant: TextStyleToken, isDense = false) {
  await render(
    <Text variant={variant} isDense={isDense}>
      Texte
    </Text>,
  );
  return screen.getByText('Texte').props.maxFontSizeMultiplier as number | undefined;
}

describe('Text caps (D-046)', () => {
  it('has text styles on both sides of the title threshold', () => {
    expect(titles.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);
  });

  it.each(titles)('caps the title style %s at the title multiplier', async (variant) => {
    expect(await multiplierOf(variant)).toBe(accessibility.maxFontSizeMultiplierTitle);
  });

  it.each(others)('lets the style %s follow the system setting', async (variant) => {
    expect(await multiplierOf(variant)).toBeUndefined();
  });

  it.each(others)('caps the style %s of a dense component at 1.3', async (variant) => {
    expect(await multiplierOf(variant, true)).toBe(accessibility.maxFontSizeMultiplierDense);
  });

  it('keeps the lower cap for a title in a dense component', async () => {
    const [title] = titles as [TextStyleToken];
    expect(await multiplierOf(title, true)).toBe(
      Math.min(accessibility.maxFontSizeMultiplierTitle, accessibility.maxFontSizeMultiplierDense),
    );
  });

  it('caps titles below dense components, as the rule asks', () => {
    expect(accessibility.maxFontSizeMultiplierTitle).toBeLessThan(
      accessibility.maxFontSizeMultiplierDense,
    );
  });
});
