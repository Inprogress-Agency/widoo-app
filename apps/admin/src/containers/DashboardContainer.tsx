'use client';

import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { ExternalDashboardLink } from '@/components/dashboard/ExternalDashboardLink';
import { FigureBand } from '@/components/dashboard/FigureBand';
import { RefreshStatus } from '@/components/dashboard/RefreshStatus';
import { ToHandleTiles } from '@/components/dashboard/ToHandleTiles';
import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { externalDashboards } from '@/config/external-dashboards';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import type { CountedAdminSection } from '@widoo/shared';
import { Button } from '@widoo/ui';

const texts = messages.dashboard;

/** The list each tile « à traiter » opens; the moderation queue filtered on what waits. */
const toHandlePaths: Record<CountedAdminSection, string> = {
  moderation: `${sectionPaths.moderation}?statut=relecture`,
  reports: sectionPaths.reports,
  support: sectionPaths.support,
  aiDrafts: sectionPaths.aiDrafts,
  translations: sectionPaths.translations,
};

/**
 * A-05, the dashboard: what waits for the role of the member, then the figures of the catalog
 * and of the users. Figures alone; the analyses stay in PostHog and RevenueCat.
 */
export function DashboardContainer() {
  const stats = useRemoteData('stats', (signal) => getSessionClients().api.getAdminStats(signal));

  if (stats.status === 'loading') {
    return <PageMessage role="status" title={messages.shell.loading} />;
  }
  if (stats.status === 'error') {
    return (
      <PageMessage
        role="alert"
        title={texts.error}
        action={<Button onClick={stats.reload}>{messages.list.retry}</Button>}
      />
    );
  }

  const { toHandle, catalog, users, generatedAt } = stats.data;
  return (
    <div className="flex flex-col gap-28">
      <DashboardSection
        title={texts.toHandle.title}
        aside={<RefreshStatus readAt={new Date(generatedAt)} onRefresh={stats.reload} />}
      >
        <ToHandleTiles toHandle={toHandle} hrefs={toHandlePaths} />
      </DashboardSection>
      <DashboardSection
        title={texts.catalog.title}
        aside={
          <ExternalDashboardLink href={externalDashboards.posthog} label={texts.catalog.link} />
        }
      >
        <FigureBand
          figures={[
            {
              label: texts.catalog.publishedRoutes,
              value: catalog.publishedRoutes,
              detail: texts.catalog.publishedDetail(catalog.premiumRoutes, catalog.officialRoutes),
            },
            {
              label: texts.catalog.places,
              value: catalog.placesInRoutes,
              detail: texts.catalog.placesDetail,
            },
            {
              label: texts.catalog.cities,
              value: catalog.cities,
              detail: texts.catalog.citiesDetail,
            },
            {
              label: texts.catalog.creators,
              value: catalog.activeCreators,
              detail: texts.catalog.last30Days,
            },
          ]}
        />
      </DashboardSection>
      <DashboardSection
        title={texts.users.title}
        aside={
          <ExternalDashboardLink href={externalDashboards.revenueCat} label={texts.users.link} />
        }
      >
        <FigureBand
          figures={[
            {
              label: texts.users.registered,
              value: users.registered,
              detail: texts.users.registeredDetail,
            },
            {
              label: texts.users.newUsers,
              value: users.newLast7Days,
              detail: texts.users.newUsersDetail,
            },
            {
              label: texts.users.premium,
              value: users.premiumActive,
              detail: texts.users.premiumDetail,
            },
            {
              label: texts.users.unlocks,
              value: users.unlocksLast30Days,
              detail: texts.catalog.last30Days,
            },
          ]}
        />
      </DashboardSection>
    </div>
  );
}
