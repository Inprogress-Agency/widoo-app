/**
 * One photo at a time on an instance (#47): reading an original and decoding it is what costs,
 * in memory above all (512 MiB an instance, 80 requests at once). The others wait their turn
 * holding no original: they read it once their turn has come.
 */
let last: Promise<void> = Promise.resolve();

/** Runs `task` once the tasks queued before it on this instance are over, failed or not. */
export function inPhotoSlot<T>(task: () => Promise<T>): Promise<T> {
  const run = last.then(task);
  last = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
