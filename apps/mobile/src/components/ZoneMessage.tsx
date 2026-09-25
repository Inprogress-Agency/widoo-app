import { size } from '@widoo/tokens';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
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

interface NoRoutesMessageProps {
  /** Active filters: the title names them, and a link removes them. */
  filterCount: number;
  onWiden: () => void;
  onClearFilters: () => void;
}

/**
 * No route in the zone (Ecrans › E-01, aucun résultat): « Élargir la zone », and « Retirer les N
 * filtres » when filters are active.
 */
export function NoRoutesMessage({ filterCount, onWiden, onClearFilters }: NoRoutesMessageProps) {
  const { t } = useTranslation();
  const hasFilters = filterCount > 0;
  return (
    <ZonePanel>
      <StatusMessage
        icon="empty"
        title={hasFilters ? t('map.noRoutes.titleFiltered') : t('map.noRoutes.title')}
        body={hasFilters ? t('map.noRoutes.bodyFiltered') : t('map.noRoutes.body')}
        action={
          <View className="items-center gap-4">
            <Button label={t('map.noRoutes.widen')} onPress={onWiden} />
            {hasFilters && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('map.noRoutes.clearFilters', { count: filterCount })}
                onPress={onClearFilters}
                className="justify-center px-16"
                style={{ minHeight: size['touch-min'] }}
              >
                <Text variant="button" color="blue-ink" className="text-center">
                  {t('map.noRoutes.clearFilters', { count: filterCount })}
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </ZonePanel>
  );
}
