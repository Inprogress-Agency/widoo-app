import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { initialDiscoveryState } from '../discovery/store';
import { discoveryStore } from '../discovery/useRouteSearch';

/** The zone of the map in the render tests: fictitious, around République. */
export const testView = {
  bbox: { west: 2.35, south: 48.86, east: 2.37, north: 48.87 },
  zoom: 14,
};

/** A fresh discovery store, its map settled on `testView`, without any search asked. */
export function resetDiscovery() {
  discoveryStore.setState({ ...initialDiscoveryState, view: testView });
}

/**
 * Renders `ui` with a query client of its own, which never retries nor keeps a garbage
 * collection timer that would outlive the test.
 */
export function renderWithQueries(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
