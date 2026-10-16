import { sectionPaths } from '@/config/navigation';
import { ActionLogContainer } from '@/containers/ActionLogContainer';
import { AdminOnlyGate } from '@/containers/AdminOnlyGate';
import { messages } from '@/messages/fr';
import { Suspense } from 'react';

/** A-12, admins only. The filters and the open line are read from the address, in the browser. */
export default function ActionLogPage() {
  return (
    <AdminOnlyGate backHref={sectionPaths.dashboard} backLabel={messages.notFound.back}>
      <Suspense>
        <ActionLogContainer />
      </Suspense>
    </AdminOnlyGate>
  );
}
