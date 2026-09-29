import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { activeFilters, isActive, quickFilters, type Filter } from '../discovery/filters';
import { resultsCount } from '../discovery/store';
import { useDiscovery } from '../discovery/useRouteSearch';
import { Chip } from '../ui/Chip';
import { filterIcon, filterLabel, filterTint, spokenFilterLabel } from './filterChip';

const keyOf = ({ group, value }: Filter) => `${group}.${value}`;

/**
 * The single row of quick chips under the search pill (Ecrans › E-01, D-010): the active filters
 * first, those of the panel included, then Gratuit, the publics, Extérieur and the moods. A tap
 * adds or removes a filter and searches the zone again; the new total is told once it answers.
 */
export function QuickChips() {
  const { t } = useTranslation();
  const filters = useDiscovery((state) => state.filters);
  const toggle = useDiscovery((state) => state.toggleFilter);
  useAnnounceTotal();
  const active = activeFilters(filters);
  const chips = [...active, ...quickFilters.filter((filter) => !isActive(filters, filter))];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t('filters.chips')}
      contentContainerClassName="gap-8 px-16 py-4"
    >
      {chips.map((filter) => {
        const isOn = isActive(filters, filter);
        const spoken = spokenFilterLabel(filter, t);
        return (
          <Chip
            key={keyOf(filter)}
            label={filterLabel(filter)}
            accessibilityLabel={isOn ? t('filters.activeChip', { label: spoken }) : spoken}
            icon={filterIcon(filter)}
            tint={filterTint(filter)}
            isActive={isOn}
            onPress={() => toggle(filter)}
          />
        );
      })}
    </ScrollView>
  );
}

/** « Un tap retire le filtre et annonce le nouveau total » (Ecrans › E-03, lecteur d'écran). */
function useAnnounceTotal() {
  const { t } = useTranslation();
  const search = useDiscovery((state) => state.search);
  const status = useDiscovery((state) => state.status);
  const results = useDiscovery((state) => state.results);
  const told = useRef<number | null>(null);
  useEffect(() => {
    if (
      search?.filtersSource === 'chip' &&
      status === 'success' &&
      results &&
      told.current !== search.id
    ) {
      told.current = search.id;
      AccessibilityInfo.announceForAccessibility(
        t('filters.counted', { count: resultsCount(results) }),
      );
    }
  }, [search, status, results, t]);
}
