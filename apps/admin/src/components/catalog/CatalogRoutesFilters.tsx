import { messages } from '@/messages/fr';
import { FilterMenu, type FilterMenuOption } from '@widoo/ui';

type CatalogRoutesFiltersProps = {
  statuses: readonly FilterMenuOption[];
  status: string | null;
  onStatusChange: (status: string | null) => void;
  accesses: readonly FilterMenuOption[];
  access: string | null;
  onAccessChange: (access: string | null) => void;
};

/** Filters of the routes of the catalog: their status, and free or Premium. */
export function CatalogRoutesFilters({
  statuses,
  status,
  onStatusChange,
  accesses,
  access,
  onAccessChange,
}: CatalogRoutesFiltersProps) {
  const texts = messages.catalog.routes.filters;
  return (
    <div role="group" aria-label={texts.label} className="flex flex-wrap gap-8">
      <FilterMenu
        label={texts.status}
        options={statuses}
        value={status}
        onChange={onStatusChange}
      />
      <FilterMenu
        label={texts.access}
        options={accesses}
        value={access}
        onChange={onAccessChange}
      />
    </div>
  );
}
