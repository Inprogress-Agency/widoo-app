import { describe, expect, it, vi } from 'vitest';
import { createFontScaleStore, type WindowSource } from './fontScale';

/** A fake `Dimensions`: a window whose font scale and width the test changes. */
function fakeWindow() {
  const window = { fontScale: 1, width: 390 };
  const handlers = new Set<() => void>();
  const source: WindowSource = {
    get: () => window,
    addEventListener: (_type, handler) => {
      handlers.add(handler);
      return { remove: () => handlers.delete(handler) };
    },
  };
  const change = (next: Partial<typeof window>) => {
    Object.assign(window, next);
    handlers.forEach((handler) => {
      handler();
    });
  };
  return { source, change, handlers };
}

describe('createFontScaleStore', () => {
  it('reads the font scale of the moment', () => {
    const { source, change } = fakeWindow();
    const store = createFontScaleStore(source);
    expect(store.getSnapshot()).toBe(1);
    change({ fontScale: 1.5 });
    expect(store.getSnapshot()).toBe(1.5);
  });

  it('tells its listeners when the system text size changes with the app open', () => {
    const { source, change } = fakeWindow();
    const store = createFontScaleStore(source);
    const onChange = vi.fn();
    store.subscribe(onChange);
    change({ fontScale: 1.3 });
    change({ fontScale: 1 });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('stays silent on a resize that keeps the text size', () => {
    const { source, change } = fakeWindow();
    const store = createFontScaleStore(source);
    const onChange = vi.fn();
    store.subscribe(onChange);
    change({ width: 844 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops listening once unsubscribed', () => {
    const { source, change, handlers } = fakeWindow();
    const store = createFontScaleStore(source);
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    unsubscribe();
    change({ fontScale: 2 });
    expect(onChange).not.toHaveBeenCalled();
    expect(handlers.size).toBe(0);
  });
});
