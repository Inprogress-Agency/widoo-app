import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { CountBadge } from '../ui/CountBadge';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useIsLargeText } from '../ui/useIsLargeText';

interface SearchPillProps {
  /** Active filters: the badge of the filters button. */
  filterCount: number;
  onOpenFilters: () => void;
  /** The search of E-02, in the results sheet. */
  onOpenSearch: () => void;
  /** The zone chosen in the search, in bold with a cross; null around the user. */
  zoneName?: string | null;
  /** The cross: back around the user. */
  onLeaveZone?: () => void;
}

/**
 * White search pill of the home (Ecrans › E-01): the way into the search (E-02), « Qu'est-ce
 * qu'on fait aujourd'hui ? », shortened from 130 % of system text; once a zone is chosen, its name
 * in bold and a cross that brings the map back around the user. The filters button inside on the
 * right: a light grey disc with the blue badge of the active filters, which opens the panel
 * (E-03).
 */
export function SearchPill({
  filterCount,
  onOpenFilters,
  onOpenSearch,
  zoneName = null,
  onLeaveZone,
}: SearchPillProps) {
  const { t } = useTranslation();
  const isLargeText = useIsLargeText();
  return (
    <View className="min-h-button-l-h flex-row items-center gap-8 rounded-pill bg-bg py-6 pl-16 pr-6">
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={
          zoneName ? t('search.pillZone', { zone: zoneName }) : t('search.fieldLabel')
        }
        accessibilityHint={t('search.opens')}
        onPress={onOpenSearch}
        className="min-h-touch-min flex-1 flex-row items-center gap-12"
      >
        <Icon {...uiIcon('search')} size="icon-l" />
        {zoneName ? (
          <Text variant="item" className="shrink">
            {zoneName}
          </Text>
        ) : (
          <Text variant="body" color="muted" className="shrink">
            {isLargeText ? t('filters.placeholderShort') : t('filters.placeholder')}
          </Text>
        )}
      </Pressable>
      {zoneName && onLeaveZone && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.leaveZone', { zone: zoneName })}
          onPress={onLeaveZone}
          className="size-touch-min items-center justify-center"
        >
          <Icon {...uiIcon('clear')} color="muted" />
        </Pressable>
      )}
      <FiltersButton count={filterCount} onPress={onOpenFilters} />
    </View>
  );
}

function FiltersButton({ count, onPress }: { count: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? t('filters.buttonActive', { count }) : t('filters.button')}
      accessibilityHint={t('filters.opens')}
      onPress={onPress}
      className="size-disc items-center justify-center rounded-pill bg-surface"
    >
      <Icon {...uiIcon('filters')} />
      {count > 0 && (
        <View className="absolute -right-4 -top-4">
          <CountBadge count={count} />
        </View>
      )}
    </Pressable>
  );
}
