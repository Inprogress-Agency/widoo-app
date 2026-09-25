import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StatusMessage } from './StatusMessage';

/**
 * White panel at the foot of the map, where the messages of the zone live (Ecrans › E-01: never
 * a banner on the map nor a toast). The results sheet of #28 takes them in.
 */
export function ZonePanel({ children }: { children: ReactNode }) {
  return <View className="rounded-t-sheet bg-bg px-24">{children}</View>;
}

/** A zone too large to list its routes: the map shows clusters, the panel asks to zoom in. */
export function ZoomInMessage({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <ZonePanel>
      <StatusMessage
        icon="map"
        title={t('map.zoomIn.title')}
        body={t('map.zoomIn.body', { count })}
      />
    </ZonePanel>
  );
}
