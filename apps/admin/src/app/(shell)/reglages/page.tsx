import { sectionPaths } from '@/config/navigation';
import { AdminOnlyGate } from '@/containers/AdminOnlyGate';
import { SettingsContainer } from '@/containers/SettingsContainer';
import { messages } from '@/messages/fr';
import { Suspense } from 'react';

/** A-11, admins only. The open setting is read from the address, in the browser only. */
export default function SettingsPage() {
  return (
    <AdminOnlyGate backHref={sectionPaths.dashboard} backLabel={messages.notFound.back}>
      <Suspense>
        <SettingsContainer />
      </Suspense>
    </AdminOnlyGate>
  );
}
