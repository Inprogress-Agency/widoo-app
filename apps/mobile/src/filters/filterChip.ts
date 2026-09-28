import { labels } from '@widoo/shared';
import { filterIcons, moodChips, type IconName } from '@widoo/tokens';
import type { TFunction } from 'i18next';
import type { Filter } from '../discovery/filters';
import type { ChipTint } from '../ui/Chip';

/** Label of a filter value, from packages/shared: « Jusqu'à 25 € », « Culture ». */
export function filterLabel({ group, value }: Filter): string {
  const groupLabels: Record<string, string> = labels.fr[group];
  return groupLabels[value] ?? value;
}

/**
 * What a screen reader says of a value: amounts and hours in words (« Jusqu'à 25 euros par
 * personne », « Jusqu'à 2 heures 30 »), the label otherwise (Ecrans › E-03, lecteur d'écran).
 */
export function spokenFilterLabel(filter: Filter, t: TFunction): string {
  if (filter.group === 'budgets') {
    return t(`filters.spoken.budgets.${filter.value}`);
  }
  if (filter.group === 'durations') {
    return t(`filters.spoken.durations.${filter.value}`);
  }
  return filterLabel(filter);
}

/** Icon of a value in `mappings.filterIcons`: none for the amounts but « Gratuit », nor the hours. */
export function filterIcon({ group, value }: Filter): IconName | undefined {
  const icons: Partial<Record<string, Partial<Record<string, IconName>>>> = filterIcons;
  return icons[group]?.[value];
}

/** A mood chip takes its tint (D-050); the others the color of their surface. */
export function filterTint(filter: Filter): ChipTint | undefined {
  return filter.group === 'moods' ? moodChips[filter.value] : undefined;
}
