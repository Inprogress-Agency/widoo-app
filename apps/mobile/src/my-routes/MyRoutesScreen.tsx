import { onlineManager, useQueryClient } from '@tanstack/react-query';
import type { OwnRouteSummary, PlannedRoute } from '@widoo/shared';
import { spacing } from '@widoo/tokens';
import { router, useFocusEffect } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import { use, useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analytics } from '../analytics';
import { routeOpenedEvent } from '../analytics/discovery';
import { useSession } from '../auth';
import { signInFlow } from '../auth/signIn';
import { StatusMessage } from '../components/StatusMessage';
import { useStartGo } from '../go/useGo';
import { plannedQueryKey } from '../plan/planned';
import { routeHref } from '../results/navigation';
import { Button } from '../ui/Button';
import { StatusLine } from '../ui/StatusLine';
import { Text } from '../ui/Text';
import { CreatedList } from './CreatedList';
import type { PastAction, Segment } from './lists';
import { EmptySegment, SignedOutRoutes } from './MyRoutesParts';
import { PastList } from './PastList';
import { Segments } from './Segments';
import { UpcomingList } from './UpcomingList';
import { myRoutesQueryKey, useMyRoutes, usePast, useUpcoming, type ListState } from './useMyRoutes';

const openRoute = (id: string, source: 'planned' | 'card') => {
  analytics.track('route_opened', routeOpenedEvent({ id }, source));
  router.push(routeHref({ id }));
};

interface SegmentBodyProps<T> {
  segment: Segment;
  list: ListState<T>;
  onRetry: () => void;
  render: (items: T[]) => ReactNode;
}

/** A segment: loading, its error, its empty block, or its list under the offline line. */
function SegmentBody<T>({ segment, list, onRetry, render }: SegmentBodyProps<T>) {
  const { t } = useTranslation();
  if (list.status === 'loading') {
    return <StatusMessage title={t(`routes.segment.${segment}`)} isBusy />;
  }
  if (list.status === 'error') {
    return (
      <StatusMessage
        icon="error"
        title={t('routes.error.title')}
        body={t('routes.error.body')}
        action={<Button label={t('routes.error.retry')} onPress={onRetry} />}
      />
    );
  }
  return (
    <>
      {list.isOffline && <StatusLine icon="wifi-slash" text={t('routes.offline')} />}
      {list.items.length === 0 ? (
        <EmptySegment segment={segment} onDiscover={() => router.navigate('/')} />
      ) : (
        render(list.items)
      )}
    </>
  );
}

/** The segments of a signed-in account: the three lists load together, a switch shows at once. */
function SignedInRoutes({ segment }: { segment: Segment }) {
  const now = new Date();
  const startGo = useStartGo();
  const upcoming = useUpcoming();
  const past = usePast();
  const created = useMyRoutes();
  // Back on the tab, the lists ask again: an outing planned or rated elsewhere shows at once.
  const client = useQueryClient();
  const uid = useSession((state) => state.user?.uid ?? '');
  useFocusEffect(
    useCallback(() => {
      if (onlineManager.isOnline()) {
        void client.invalidateQueries({ queryKey: plannedQueryKey(uid) });
        void client.invalidateQueries({ queryKey: myRoutesQueryKey(uid) });
      }
    }, [client, uid]),
  );

  const openPlanned = (outing: PlannedRoute) => {
    if (outing.routeId) {
      openRoute(outing.routeId, 'planned');
    }
  };
  const onPastAction = (outing: PlannedRoute, action: PastAction) => {
    if (action === 'rate') {
      router.push({ pathname: '/rate/[id]', params: { id: outing.id } });
    } else if (action === 'relaunch' && outing.routeId) {
      void startGo(outing.routeId);
    } else {
      openPlanned(outing);
    }
  };

  switch (segment) {
    case 'upcoming':
      return (
        <SegmentBody
          segment={segment}
          list={upcoming.state}
          onRetry={upcoming.refetch}
          render={(items: PlannedRoute[]) => (
            <UpcomingList
              outings={items}
              now={now}
              onOpen={openPlanned}
              onGo={(outing) => outing.routeId && void startGo(outing.routeId)}
            />
          )}
        />
      );
    case 'favorites':
      // The favourites come with their API (#39): until then, the empty block says so.
      return <EmptySegment segment={segment} onDiscover={() => undefined} />;
    case 'past':
      return (
        <SegmentBody
          segment={segment}
          list={past.state}
          onRetry={past.refetch}
          render={(items: PlannedRoute[]) => (
            <PastList outings={items} now={now} onOpen={openPlanned} onAction={onPastAction} />
          )}
        />
      );
    case 'created':
      return (
        <SegmentBody
          segment={segment}
          list={created.state}
          onRetry={created.refetch}
          render={(items: OwnRouteSummary[]) => (
            <CreatedList routes={items} now={now} onOpen={(route) => openRoute(route.id, 'card')} />
          )}
        />
      );
  }
}

/**
 * E-08, the tab « Parcours » (Ecrans › E-08): the outings to come, the favourites, the outings
 * done and my creations, in four segments; without account, the invitation to E-10.
 */
export function MyRoutesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = use(BottomTabBarHeightContext) ?? 0;
  const status = useSession((state) => state.status);
  const [segment, setSegment] = useState<Segment>('upcoming');
  return (
    // Safe area measured at runtime.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerClassName="gap-16 p-16"
        // Tab bar height measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + tabBarHeight }}
      >
        {status === 'anonymous' ? (
          <SignedOutRoutes
            // The general invitation of the account, as the profile's: no route to plan here.
            onSignIn={() => void signInFlow.requireAccount('profile', () => undefined)}
          />
        ) : (
          <>
            <Text variant="title-xl" accessibilityRole="header">
              {t('routes.title')}
            </Text>
            <Segments selected={segment} onSelect={setSegment} />
            {status === 'signedIn' && <SignedInRoutes segment={segment} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}
