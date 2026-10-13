import { messages } from '@/messages/fr';
import { FilterMenu, type FilterMenuOption } from '@widoo/ui';

type CatalogPlacesFiltersProps = {
  categories: readonly FilterMenuOption[];
  category: string | null;
  onCategoryChange: (category: string | null) => void;
  statuses: readonly FilterMenuOption[];
  status: string | null;
  onStatusChange: (status: string | null) => void;
};

/** Filters of the places of the catalog: their category, and how far they are verified. */
export function CatalogPlacesFilters({
  categories,
  category,
  onCategoryChange,
  statuses,
  status,
  onStatusChange,
}: CatalogPlacesFiltersProps) {
  const texts = messages.catalog.places.filters;
  return (
    <div role="group" aria-label={texts.label} className="flex flex-wrap gap-8">
      <FilterMenu
        label={texts.category}
        options={categories}
        value={category}
        onChange={onCategoryChange}
      />
      <FilterMenu
        label={texts.status}
        options={statuses}
        value={status}
        onChange={onStatusChange}
      />
    </div>
  );
}
