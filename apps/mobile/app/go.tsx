import type { PlannedRoute } from '@widoo/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useIsOnline } from '../src/discovery/useRouteSearch';
import { GoPage } from '../src/go/GoPage';
import { GoSections } from '../src/go/GoSections';
import { GO_SHEET_PEEK, GoSheet } from '../src/go/GoSheet';
import { useGo, useGoActions } from '../src/go/useGo';
import type { GoProgress } from '../src/go/progress';
import { OutingEnd } from '../src/rating/OutingEnd';
import { useRateOuting } from '../src/rating/useRateOuting';
import { useRouteSheet } from '../src/route/useRouteSheet';

/** Back under the tabs: the mini-player takes over (M-11), or the modal goes down (M-02). */
const collapse = () => {
  if (router.canGoBack()) {
    router.back();
  }
};

interface GoProps {
  planned: PlannedRoute;
  progress: GoProgress;
  /** « Terminer la sortie » went through: E-15 takes the place of E-07. */
  onEnded: (outing: PlannedRoute) => void;
}

function Go({ planned, progress, onEnded }: GoProps) {
  const isOnline = useIsOnline();
  const { state } = useRouteSheet(planned.route.id);
  const actions = useGoActions(planned, progress);
  const route = state.status === 'ready' ? state.route : null;
  const finish = () =>
    void actions.finish().then((outing) => {
      if (outing) {
        onEnded(outing);
      }
    });
  return (
    <>
      <GoPage
        planned={planned}
        progress={progress}
        route={route}
        isOnline={isOnline}
        sheetPeek={GO_SHEET_PEEK}
        onCollapse={collapse}
        onDirections={() => void actions.directions()}
        onArrived={actions.arrive}
        onNext={() => void actions.next()}
        onFinish={finish}
      >
        <GoSections progress={progress} route={route} now={new Date()} />
      </GoPage>
      <GoSheet planned={planned} progress={progress} onFinish={finish} onStop={actions.stop} />
    </>
  );
}

/**
 * E-07, the route under way, full screen over the tabs (M-02). Once « Terminer la sortie » went
 * through, E-15 replaces it in the same modal, in a fade (M-08), until its « Terminer ». Without
 * a Go in progress (closed on another phone, or by the job of 4:00), it goes back down.
 */
export default function GoScreen() {
  const { planned, progress } = useGo();
  const [ended, setEnded] = useState<PlannedRoute | null>(null);
  const rate = useRateOuting();
  const isGone = (!planned || !progress) && !ended;
  useEffect(() => {
    if (isGone) {
      collapse();
    }
  }, [isGone]);
  if (ended) {
    return (
      <OutingEnd
        outing={ended}
        onFinish={(given) => {
          void rate(ended, given, 'go_end');
          collapse();
        }}
      />
    );
  }
  if (!planned || !progress) {
    return <View className="flex-1 bg-surface-strong" />;
  }
  return <Go planned={planned} progress={progress} onEnded={setEnded} />;
}
