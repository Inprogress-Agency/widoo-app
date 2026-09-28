import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSplashGate } from './splash-gate';

describe('createSplashGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides the launch screen when the home is ready, and only then', () => {
    const hide = vi.fn();
    const gate = createSplashGate(hide, 2000);
    vi.advanceTimersByTime(1500);
    expect(hide).not.toHaveBeenCalled();
    gate.release();
    expect(hide).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('hides it after the longest wait when the home is late (E-18: 2 s at most)', () => {
    const hide = vi.fn();
    const gate = createSplashGate(hide, 2000);
    vi.advanceTimersByTime(1999);
    expect(hide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hide).toHaveBeenCalledTimes(1);
    gate.release();
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
