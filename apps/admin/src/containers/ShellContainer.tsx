'use client';

import { AccountMenu } from '@/components/shell/AccountMenu';
import { AdminShell } from '@/components/shell/AdminShell';
import { AdminSidebar, type SidebarEntry } from '@/components/shell/AdminSidebar';
import { PageMessage } from '@/components/states/PageMessage';
import { navigationFor, sectionOfPath, sectionPaths } from '@/config/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSession } from '@/hooks/useSession';
import { signInPathFor } from '@/lib/return-path';
import { messages } from '@/messages/fr';
import type { AdminSection } from '@widoo/shared';
import { Button, TooltipProvider } from '@widoo/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

// Wiki Ecrans › Admin web, « Navigation »: the full menu from 1 280 px, its icons below.
const fullMenuQuery = '(min-width: 1280px)';

const entryOf = (section: AdminSection): SidebarEntry => ({
  section,
  href: sectionPaths[section],
  label: messages.sections[section],
});

/**
 * The shell around every page of the admin: only for a member of the team, with the navigation
 * of its role. Anyone else is sent to the sign-in page, which remembers the page asked for.
 */
export function ShellContainer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut, retry } = useSession();
  const hasRoomForFullMenu = useMediaQuery(fullMenuQuery);
  const [isMenuReduced, setIsMenuReduced] = useState(false);

  useEffect(() => {
    if (session.status === 'signedOut') {
      router.replace(signInPathFor(`${window.location.pathname}${window.location.search}`));
    }
  }, [session.status, router]);

  if (session.status === 'unavailable') {
    return (
      <PageMessage
        role="alert"
        title={messages.signIn.errors.unavailable}
        action={<Button onClick={retry}>{messages.signIn.retry}</Button>}
      />
    );
  }
  if (session.status !== 'signedIn') {
    return <PageMessage role="status" title={messages.shell.loading} />;
  }

  const { member } = session;
  const activeSection = sectionOfPath(pathname);
  const groups = navigationFor(member.role).map((group) => ({
    id: group.id,
    label: messages.shell.groups[group.id],
    entries: group.sections.map(entryOf),
  }));

  return (
    <TooltipProvider delayDuration={200}>
      <AdminShell
        title={activeSection ? messages.sections[activeSection] : messages.notFound.title}
        sidebar={
          <AdminSidebar
            home={entryOf('dashboard')}
            groups={groups}
            activeSection={activeSection}
            isIconOnly={!hasRoomForFullMenu || isMenuReduced}
            onToggle={
              hasRoomForFullMenu ? () => setIsMenuReduced((isReduced) => !isReduced) : undefined
            }
          />
        }
        account={
          <AccountMenu
            name={member.firstName ?? member.email ?? messages.shell.account}
            email={member.email}
            roleLabel={messages.roles[member.role]}
            onSignOut={() => void signOut()}
          />
        }
      >
        {children}
      </AdminShell>
    </TooltipProvider>
  );
}
