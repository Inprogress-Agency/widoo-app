import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { accessibility } from '@widoo/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button } from './Button';
import { DiscButton } from './DiscButton';
import { InfoTile } from './InfoTile';
import { PhotoCounter } from './PhotoCounter';
import { StickyBar } from './StickyBar';

const dense = accessibility.maxFontSizeMultiplierDense;
const capOf = (text: string) =>
  screen.getByText(text, { includeHiddenElements: true }).props.maxFontSizeMultiplier as number;
const noop = () => undefined;
const insets = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('base components of the route sheet (D-046)', () => {
  it('reads an info tile as one element, its text capped at 1.3', async () => {
    await render(
      <InfoTile icon="duration" value="7 h" label="Durée" accessibilityLabel="7 heures, durée" />,
    );
    expect(screen.getByLabelText('7 heures, durée')).toBeTruthy();
    expect(capOf('7 h')).toBe(dense);
    expect(capOf('Durée')).toBe(dense);
  });

  it('hides the photo counter, capped at 1.3: the carousel says the photo itself', async () => {
    await render(<PhotoCounter index={0} count={6} />);
    expect(screen.queryByText('1 / 6')).toBeNull();
    expect(capOf('1 / 6')).toBe(dense);
  });

  it('keeps the buttons of the sticky bar dense, side by side', async () => {
    await render(
      <SafeAreaProvider initialMetrics={insets}>
        <StickyBar>
          <Button label="Programmer" icon="duration" variant="secondary" isDense onPress={noop} />
          <Button label="C'est parti" isDense onPress={noop} />
        </StickyBar>
      </SafeAreaProvider>,
    );
    expect(capOf('Programmer')).toBe(dense);
    expect(capOf("C'est parti")).toBe(dense);
  });

  it('announces a disabled button and does not press it', async () => {
    const onPress = jest.fn();
    await render(<Button label="Programmer" isDisabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Programmer' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('names a disc button by its label', async () => {
    const onPress = jest.fn();
    await render(
      <DiscButton icon="share" accessibilityLabel="Partager le parcours" onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Partager le parcours' }));
    expect(onPress).toHaveBeenCalled();
  });
});
