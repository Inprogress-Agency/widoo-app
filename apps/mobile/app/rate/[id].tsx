import { useQueryClient } from '@tanstack/react-query';
import type { PlannedRoute } from '@widoo/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { session } from '../../src/auth';
import { pastQueryKey } from '../../src/my-routes/useMyRoutes';
import { OutingEnd } from '../../src/rating/OutingEnd';
import { useRateOuting } from '../../src/rating/useRateOuting';

const close = () => {
  if (router.canGoBack()) {
    router.back();
  }
};

/**
 * E-15 opened by « Noter » of Parcours › Passés (E-08): the same page as at the end of the Go,
 * in a modal, `route_rated` with `source: past`. The outing is the one of the list, kept in
 * memory; without it (the list forgotten meanwhile), the modal goes back down.
 */
export default function RatePastOutingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const rate = useRateOuting();
  const [outing] = useState<PlannedRoute | null>(() => {
    const uid = session.store.getState().user?.uid ?? '';
    const past = client.getQueryData<PlannedRoute[]>(pastQueryKey(uid));
    return past?.find((item) => item.id === id) ?? null;
  });
  useEffect(() => {
    if (!outing) {
      close();
    }
  }, [outing]);
  if (!outing) {
    return <View className="flex-1 bg-bg" />;
  }
  return (
    <OutingEnd
      outing={outing}
      onFinish={(given) => {
        void rate(outing, given, 'past');
        close();
      }}
    />
  );
}
