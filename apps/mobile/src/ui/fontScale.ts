/** The part of React Native's `Dimensions` read here: the window and its change event. */
export interface WindowSource {
  get(dimension: 'window'): { fontScale: number };
  addEventListener(type: 'change', handler: () => void): { remove(): void };
}

export interface FontScaleStore {
  /** Calls `onChange` when the system text size changes, not on a mere resize. */
  subscribe(onChange: () => void): () => void;
  getSnapshot(): number;
}

/**
 * System text size, read at render time and followed while the app is open. A store for
 * `useSyncExternalStore`: its listeners only hear of a new font scale, so a rotation or a split
 * screen does not re-render every text of the app.
 */
export function createFontScaleStore(source: WindowSource): FontScaleStore {
  return {
    subscribe(onChange) {
      let fontScale = source.get('window').fontScale;
      const subscription = source.addEventListener('change', () => {
        const next = source.get('window').fontScale;
        if (next !== fontScale) {
          fontScale = next;
          onChange();
        }
      });
      return () => {
        subscription.remove();
      };
    },
    getSnapshot: () => source.get('window').fontScale,
  };
}
