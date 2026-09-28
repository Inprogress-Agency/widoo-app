import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { CountBadge } from '../ui/CountBadge';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

interface SearchPillProps {
  /** Active filters: the badge of the filters button. */
  filterCount: number;
  onOpenFilters: () => void;
}

/**
 * White search pill of the home (Ecrans › E-01), with the filters button inside on the right: a
 * light grey disc with the blue badge of the active filters, which opens the panel (E-03). The
 * field is its place only until the search of E-02 (#30): out of reach of screen readers.
 */
export function SearchPill({ filterCount, onOpenFilters }: SearchPillProps) {
  const { t } = useTranslation();
  return (
    <View className="min-h-button-l-h flex-row items-center gap-12 rounded-pill bg-bg py-6 pl-16 pr-6">
      <View
        className="flex-1 flex-row items-center gap-12"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Icon {...uiIcon('search')} size="icon-l" />
        <Text variant="body" color="muted" className="shrink">
          {t('filters.placeholder')}
        </Text>
      </View>
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
