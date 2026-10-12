'use client';

import { AccountMenu } from '@/components/shell/AccountMenu';
import { AdminShell } from '@/components/shell/AdminShell';
import { AdminSidebar, type SidebarEntry } from '@/components/shell/AdminSidebar';
import { PageMessage } from '@/components/states/PageMessage';
import { navigationFor, sectionOfPath, sectionPaths } from '@/config/navigation';
import { useAdminCounters } from '@/hooks/useAdminCounters';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSession } from '@/hooks/useSession';
import { counterLabel } from '@/lib/counter-label';
import { signInPathFor } from '@/lib/return-path';
import { messages } from '@/messages/fr';
import {
  countedAdminSections,
  type AdminCounters,
  type AdminSection,
  type CountedAdminSection,
} from '@widoo/shared';
import { Button, TooltipProvider } from '@widoo/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

// Wiki Ecrans › Admin web, « Navigation »: the full menu from 1 280 px, its icons below.
const fullMenuQuery = '(min-width: 1280px)';

const isCounted = (section: AdminSection): section is CountedAdminSection =>
  countedAdminSections.some((counted) => counted === section);

/** The entry of a section, with its counter when something waits there. */
function entryOf(section: AdminSection, counters: AdminCounters): SidebarEntry {
  const counter = isCounted(section) ? counters[section] : undefined;
  return {
    section,
    href: sectionPaths[section],
    label: messages.sections[section],
    counter:
      isCounted(section) && counter && counter.count > 0
        ? {
            count: counter.count,
            isLate: counter.lateCount > 0,
            label: counterLabel(section, counter),
          }
        : undefined,
  };
}

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
  const counters = useAdminCounters(session.status === 'signedIn');

  useEffect(() => {
    // Signed out, or stopped at the second factor: both are finished on the sign-in page.
    const isAtTheDoor =
      session.status === 'signedOut' ||
      session.status === 'secondFactorChallenge' ||
      session.status === 'secondFactorEnrollment';
    if (isAtTheDoor) {
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
    entries: group.sections.map((section) => entryOf(section, counters)),
  }));

  return (
    <TooltipProvider delayDuration={200}>
      <AdminShell
        title={
          activeSection
            ? (messages.pageTitles[activeSection] ?? messages.sections[activeSection])
            : messages.notFound.title
        }
        sidebar={
          <AdminSidebar
            home={entryOf('dashboard', counters)}
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
