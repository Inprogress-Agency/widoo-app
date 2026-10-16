import { ModerationQueueContainer } from '@/containers/ModerationQueueContainer';
import { Suspense } from 'react';

/** A-02. The state of the queue is read from the address, in the browser only. */
export default function ModerationPage() {
  return (
    <Suspense>
      <ModerationQueueContainer />
    </Suspense>
  );
}
