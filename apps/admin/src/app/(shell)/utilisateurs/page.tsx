import { UsersContainer } from '@/containers/UsersContainer';
import { Suspense } from 'react';

/** A-06. The state of the list and the open account are read from the address, in the browser. */
export default function UsersPage() {
  return (
    <Suspense>
      <UsersContainer />
    </Suspense>
  );
}
