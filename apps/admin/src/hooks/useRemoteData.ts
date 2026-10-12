import { useEffect, useEffectEvent, useState } from 'react';

type Loaded<Data> = { key: string; data: Data } | { key: string; data: null };

export type RemoteData<Data> =
  | { status: 'loading' }
  | { status: 'error'; reload: () => void }
  | { status: 'ready'; data: Data; reload: () => void };

/**
 * Data read from the API for a screen: loading, then ready or in error, and read again when
 * `key` changes or `reload` is called. `key` says what is asked (the query of a list); `read`
 * receives a signal, aborted when the answer is no longer wanted.
 */
export function useRemoteData<Data>(
  key: string,
  read: (signal: AbortSignal) => Promise<Data>,
): RemoteData<Data> {
  const [loaded, setLoaded] = useState<Loaded<Data> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${attempt}:${key}`;
  const readLatest = useEffectEvent(read);

  useEffect(() => {
    const controller = new AbortController();
    readLatest(controller.signal)
      .then((data) => setLoaded({ key: requestKey, data }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, data: null });
        }
      });
    return () => controller.abort();
  }, [requestKey]);

  const reload = () => setAttempt((count) => count + 1);
  if (loaded?.key !== requestKey) {
    return { status: 'loading' };
  }
  return loaded.data === null
    ? { status: 'error', reload }
    : { status: 'ready', data: loaded.data, reload };
}
