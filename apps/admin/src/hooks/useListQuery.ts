import {
  parseListQuery,
  serializeListQuery,
  toggledSort,
  type ListQuery,
  type ListQueryOptions,
} from '@/lib/list-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * The state of a list, read from and written to its address: search, filters, sort and page.
 * Changing the search, a filter or the sort goes back to the first page.
 */
export function useListQuery<Filter extends string, Column extends string>(
  options: ListQueryOptions<Filter, Column>,
) {
  const router = useRouter();
  const pathname = usePathname();
  const query = parseListQuery(useSearchParams(), options);

  const show = (next: ListQuery<Filter, Column>) => {
    const address = serializeListQuery(next, options);
    router.replace(address ? `${pathname}?${address}` : pathname, { scroll: false });
  };
  const fromFirstPage = (changes: Partial<ListQuery<Filter, Column>>) =>
    show({ ...query, ...changes, cursor: null });

  return {
    query,
    handleSearch: (search: string) => fromFirstPage({ search }),
    /** Sets a filter to `value`, or removes it when it already has this value. */
    handleFilter: (filter: Filter, value: string) =>
      fromFirstPage({
        filters: {
          ...query.filters,
          [filter]: query.filters[filter] === value ? undefined : value,
        },
      }),
    handleSort: (column: Column) => fromFirstPage({ sort: toggledSort(query.sort, column) }),
    handlePage: (cursor: string | null) => show({ ...query, cursor }),
  };
}
