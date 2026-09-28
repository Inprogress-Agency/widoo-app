/**
 * Hides the launch screen once: when the home says it is ready, or after `maxMs` at the latest
 * (E-18, D-060). Kept apart from the native module so the race between the two is testable.
 */
export function createSplashGate(hide: () => void, maxMs: number) {
  let isHidden = false;
  const timer = setTimeout(() => release(), maxMs);

  function release(): void {
    if (isHidden) {
      return;
    }
    isHidden = true;
    clearTimeout(timer);
    hide();
  }

  return { release };
}
