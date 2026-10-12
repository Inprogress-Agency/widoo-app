import { useEffect, useState } from 'react';

/**
 * Seconds left before something is allowed again, counted down from `start()`; 0 once allowed.
 */
export function useCountdown(seconds: number): { secondsLeft: number; start: () => void } {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft === 0) {
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return { secondsLeft, start: () => setSecondsLeft(seconds) };
}
