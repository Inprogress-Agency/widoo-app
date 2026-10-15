import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { platform, calls, nativeFault, expoHaptics, sentry } = vi.hoisted(() => {
  const calls: string[] = [];
  const nativeFault = { message: undefined as string | undefined };
  // Plain functions, not `vi.fn`: a spy attaches its own handlers to a returned promise, which
  // would hide the very unhandled rejection this test looks for.
  const refuse =
    (name: string) =>
    (arg?: string): Promise<void> => {
      calls.push(arg === undefined ? name : `${name}:${arg}`);
      if (nativeFault.message) throw new Error(nativeFault.message);
      return Promise.reject(new Error('A haptics engine is not available on this device'));
    };
  return {
    platform: { OS: 'android' as 'android' | 'ios' },
    calls,
    nativeFault,
    expoHaptics: {
      performAndroidHapticsAsync: refuse('performAndroidHapticsAsync'),
      selectionAsync: refuse('selectionAsync'),
      impactAsync: refuse('impactAsync'),
      notificationAsync: refuse('notificationAsync'),
      AndroidHaptics: { Toggle_On: 'toggle-on', Confirm: 'confirm', Reject: 'reject' },
      ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
      NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    },
    sentry: { captureException: vi.fn() },
  };
});

vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('expo-haptics', () => expoHaptics);
vi.mock('@sentry/react-native', () => sentry);

const { haptic } = await import('./haptics');

/** Lets the rejected promises settle, so that an unhandled one would be reported. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('haptic on a phone without a haptics engine', () => {
  const unhandled = vi.fn();

  beforeEach(() => {
    process.on('unhandledRejection', unhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', unhandled);
    calls.length = 0;
    nativeFault.message = undefined;
    vi.clearAllMocks();
  });

  it('drops the refusal of the engine on Android, silently', async () => {
    platform.OS = 'android';
    expect(() => {
      haptic('toastSuccess');
    }).not.toThrow();
    await settle();
    expect(calls).toEqual(['performAndroidHapticsAsync:confirm']);
    expect(unhandled).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('drops the refusal of every iOS method, silently', async () => {
    platform.OS = 'ios';
    expect(() => {
      haptic('favoriteOn');
      haptic('ratingStar');
      haptic('toastError');
    }).not.toThrow();
    await settle();
    expect(calls).toEqual(['impactAsync:light', 'selectionAsync', 'notificationAsync:error']);
    expect(unhandled).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('stays silent when the native module throws before any promise', () => {
    platform.OS = 'android';
    nativeFault.message = 'Cannot find native module ExpoHaptics';
    expect(() => {
      haptic('arrived');
    }).not.toThrow();
    expect(calls).toHaveLength(1);
  });
});
