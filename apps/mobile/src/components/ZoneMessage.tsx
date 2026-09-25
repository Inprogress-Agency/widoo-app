import { size } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { StatusMessage } from './StatusMessage';

/**
 * A zone too large to list its routes: the map shows clusters, the sheet asks to zoom in. The
 * messages of the zone live in the sheet, never in a banner on the map nor a toast (E-01).
 */
export function ZoomInMessage({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <StatusMessage
      icon="map"
      title={t('map.zoomIn.title')}
      body={t('map.zoomIn.body', { count })}
    />
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
  );
}
