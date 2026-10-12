import { messages } from '@/messages/fr';
import type { ModerationQueue } from '@widoo/shared';
import { FilterChip, FilterMenu, type FilterMenuOption } from '@widoo/ui';

export type ModerationFilterChoice = 'pending' | 'changesRequested' | 'late' | 'revisions';

type ModerationQueueFiltersProps = {
  /** Size of each filter over the whole queue; absent while the queue loads. */
  counts?: ModerationQueue['counts'];
  /** The filters that apply now. */
  active: Record<ModerationFilterChoice, boolean>;
  onToggle: (filter: ModerationFilterChoice) => void;
  /** Cities that have a route in the queue. */
  cities: readonly FilterMenuOption[];
  /** Identifier of the city chosen, null without a choice. */
  cityId: string | null;
  onCityChange: (cityId: string | null) => void;
};

const choices: ModerationFilterChoice[] = ['pending', 'changesRequested', 'late', 'revisions'];

/** Filters of the moderation queue, as chips with the number of routes each one holds. */
export function ModerationQueueFilters({
  counts,
  active,
  onToggle,
  cities,
  cityId,
  onCityChange,
}: ModerationQueueFiltersProps) {
  return (
    <div
      role="group"
      aria-label={messages.moderation.filters.label}
      className="flex flex-wrap gap-8"
    >
      {choices.map((choice) => (
        <FilterChip
          key={choice}
          label={messages.moderation.filters[choice]}
          count={counts?.[choice]}
          isActive={active[choice]}
          onClick={() => onToggle(choice)}
        />
      ))}
      <FilterMenu
        label={messages.moderation.filters.city}
        options={cities}
        value={cityId}
        onChange={onCityChange}
      />
    </div>
  );
}
