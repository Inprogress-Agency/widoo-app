import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useIsOnline } from '../src/discovery/useRouteSearch';
import { GoPage } from '../src/go/GoPage';
import { useGo, useGoActions } from '../src/go/useGo';
import type { GoProgress } from '../src/go/progress';
import type { PlannedRoute } from '@widoo/shared';
import { useRouteSheet } from '../src/route/useRouteSheet';

/** Back under the tabs: the mini-player takes over (M-11). */
const collapse = () => {
  if (router.canGoBack()) {
    router.back();
  }
};

function Go({ planned, progress }: { planned: PlannedRoute; progress: GoProgress }) {
  const isOnline = useIsOnline();
  const { state } = useRouteSheet(planned.route.id);
  const actions = useGoActions(planned, progress, collapse);
  return (
    <GoPage
      planned={planned}
      progress={progress}
      route={state.status === 'ready' ? state.route : null}
      isOnline={isOnline}
      sheetPeek={0}
      onCollapse={collapse}
      onDirections={() => void actions.directions()}
      onArrived={actions.arrive}
      onNext={() => void actions.next()}
      onFinish={() => void actions.finish()}
    />
  );
}

/**
 * E-07, the route under way, full screen over the tabs (M-02). Without a Go in progress (closed
 * on another phone, or by the job of 4:00), it goes back down.
 */
export default function GoScreen() {
  const { planned, progress } = useGo();
  const isGone = !planned || !progress;
  useEffect(() => {
    if (isGone) {
      collapse();
    }
  }, [isGone]);
  if (!planned || !progress) {
    return <View className="flex-1 bg-surface-strong" />;
  }
  return <Go planned={planned} progress={progress} />;
}
