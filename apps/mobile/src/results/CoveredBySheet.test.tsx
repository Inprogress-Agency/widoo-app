import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { CoveredBySheet } from './CoveredBySheet';
import type { SheetLevel } from './sheet';

async function renderAt(level: SheetLevel) {
  await render(
    <CoveredBySheet level={level}>
      <Pressable accessibilityRole="button" accessibilityLabel="Filtres">
        <Text>Filtres</Text>
      </Pressable>
    </CoveredBySheet>,
  );
}

describe('CoveredBySheet', () => {
  it.each(['rest', 'half'] as const)('leaves the home within reach at %s', async (level) => {
    await renderAt(level);
    expect(screen.root?.props).toMatchObject({
      accessibilityElementsHidden: false,
      importantForAccessibility: 'auto',
    });
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
  });

  it('hides the home from VoiceOver and TalkBack under the sheet at full', async () => {
    await renderAt('full');
    expect(screen.root?.props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });
    expect(screen.queryByRole('button', { name: 'Filtres' })).toBeNull();
    const button = screen.getByRole('button', { name: 'Filtres', includeHiddenElements: true });
    expect(button).not.toBeVisible();
  });

  it('gives the home back when the sheet comes down from full', async () => {
    await renderAt('full');
    await screen.rerender(
      <CoveredBySheet level="half">
        <Pressable accessibilityRole="button" accessibilityLabel="Filtres">
          <Text>Filtres</Text>
        </Pressable>
      </CoveredBySheet>,
    );
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
  });
});
