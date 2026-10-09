import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { colors, firstLaunch, size } from '@widoo/tokens';
import { Avatar } from './Avatar';

// The logo is drawn by react-native-svg on the device: here, only what the avatar gives it.
const mockLogo = jest.fn<(props: object) => null>(() => null);
jest.mock('./svg/generated/AvatarWidoo', () => ({
  __esModule: true,
  default: (props: object) => mockLogo(props),
}));

describe('Avatar', () => {
  beforeEach(() => {
    mockLogo.mockClear();
  });

  it('shows the Widoo logo for a route of the team, painted with the tokens', async () => {
    await render(<Avatar url={null} name="Widoo" isWidoo />);
    expect(mockLogo).toHaveBeenCalledWith({
      size: size['avatar-s'],
      color: colors['blue-on-strong'],
      gradientFrom: firstLaunch.logo.stroke.gradient[0],
      gradientTo: firstLaunch.logo.stroke.gradient[1],
    });
    // Decorative: « Par Widoo » after it is the label, no initial is drawn.
    expect(screen.queryByText('W', { includeHiddenElements: true })).toBeNull();
  });

  it('scales the logo to the creator box', async () => {
    await render(<Avatar url={null} name="Widoo" isWidoo size="avatar-l" />);
    expect(mockLogo).toHaveBeenCalledWith(expect.objectContaining({ size: size['avatar-l'] }));
  });

  it('shows the initial of a member, hidden from screen readers, never the logo', async () => {
    await render(<Avatar url={null} name="camille" />);
    expect(screen.queryByText('C')).toBeNull();
    expect(screen.getByText('C', { includeHiddenElements: true })).toBeTruthy();
    expect(mockLogo).not.toHaveBeenCalled();
  });
});
