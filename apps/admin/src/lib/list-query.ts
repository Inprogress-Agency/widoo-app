import type { SortDirection } from '@widoo/ui';

/** State of a list kept in its address, so that a link shows the same list (wiki Admin-Web). */
export type ListQuery<Filter extends string, Column extends string> = {
  /** Text of the search field; empty without a search. */
  search: string;
  /** Active filters, with their value: `{ statut: 'pending', ville: 'paris' }`. */
  filters: Partial<Record<Filter, string>>;
  sort: { column: Column; direction: SortDirection };
  /** Cursor of the page shown; null on the first page. */
  cursor: string | null;
};

/** What a list accepts in its address: anything else is ignored. */
export type ListQueryOptions<Filter extends string, Column extends string> = {
  filters: readonly Filter[];
  sortableColumns: readonly Column[];
  defaultSort: { column: Column; direction: SortDirection };
};

// Names of the parameters in the address, in French as the paths of the admin.
const searchParam = 'q';
const sortParam = 'tri';
const cursorParam = 'page';

/**
 * Reads the state of a list from its address. The address is typed by anyone: an unknown filter
 * or column is dropped, never passed on.
 */
export function parseListQuery<Filter extends string, Column extends string>(
  params: URLSearchParams,
  options: ListQueryOptions<Filter, Column>,
): ListQuery<Filter, Column> {
  const filters: Partial<Record<Filter, string>> = {};
  for (const filter of options.filters) {
    const value = params.get(filter);
    if (value) {
      filters[filter] = value;
    }
  }
  // `-recu` sorts by `recu` from the last to the first.
  const sortValue = params.get(sortParam) ?? '';
  const column = options.sortableColumns.find(
    (sortable) => sortable === sortValue.replace(/^-/, ''),
  );
  return {
    search: params.get(searchParam)?.trim() ?? '',
    filters,
    sort: column
      ? { column, direction: sortValue.startsWith('-') ? 'desc' : 'asc' }
      : options.defaultSort,
    cursor: params.get(cursorParam) || null,
  };
}

/** The address of a list state, shortest first: the default sort and the first page are left out. */
export function serializeListQuery<Filter extends string, Column extends string>(
  query: ListQuery<Filter, Column>,
  options: ListQueryOptions<Filter, Column>,
): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set(searchParam, query.search);
  }
  for (const filter of options.filters) {
    const value = query.filters[filter];
    if (value) {
      params.set(filter, value);
    }
  }
  const { column, direction } = query.sort;
  if (column !== options.defaultSort.column || direction !== options.defaultSort.direction) {
    params.set(sortParam, direction === 'desc' ? `-${column}` : column);
  }
  if (query.cursor) {
    params.set(cursorParam, query.cursor);
  }
  return params.toString();
}

/** The next sort after a click on a column: its other direction, or ascending on a new column. */
export function toggledSort<Column extends string>(
  current: { column: Column; direction: SortDirection },
  column: Column,
): { column: Column; direction: SortDirection } {
  const isSameColumn = current.column === column;
  return { column, direction: isSameColumn && current.direction === 'asc' ? 'desc' : 'asc' };
}
