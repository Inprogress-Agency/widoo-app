import { useEffect, useState } from 'react';

/**
 * True once `isPending` has lasted `delayMs`: a wait that is short enough shows nothing, so that a
 * loading state does not flash for a fraction of a second. False again as soon as it ends.
 */
export function useIsSlow(isPending: boolean, delayMs: number): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => {
      clearTimeout(timer);
      setIsSlow(false);
    };
  }, [isPending, delayMs]);

  return isPending && isSlow;
}
