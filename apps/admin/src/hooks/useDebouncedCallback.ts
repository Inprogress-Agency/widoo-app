import { useEffect, useRef } from 'react';

/**
 * `callback`, called once the calls have stopped for `delayMs`: a search waits for the person to
 * stop typing. A call still waiting is dropped when the component leaves.
 */
export function useDebouncedCallback<Value>(
  callback: (value: Value) => void,
  delayMs: number,
): (value: Value) => void {
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (value) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => latest.current(value), delayMs);
  };
}
