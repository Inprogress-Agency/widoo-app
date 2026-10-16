import { useEffect, useState } from 'react';

/** Renders the component again every minute, for what is written relative to now. */
export function useMinuteTick(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
}
