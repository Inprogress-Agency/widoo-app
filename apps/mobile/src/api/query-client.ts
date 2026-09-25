import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { AppState } from 'react-native';
import { shouldRetry } from './retry';
import { OFFLINE_MAX_AGE_MS, searchQueryKey } from './search-cache';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry },
  },
});

// The searches stay in memory as long as they may be shown offline: the last one is restored
// from the device at launch, and would otherwise be dropped after five minutes unused.
queryClient.setQueryDefaults(searchQueryKey, { gcTime: OFFLINE_MAX_AGE_MS });

// Offline, queries pause instead of failing, and resume once the network is back. The listener
// tells changes only: the state at launch is read once.
onlineManager.setEventListener((setOnline) => {
  const subscription = addNetworkStateListener((state) => setOnline(state.isConnected !== false));
  void getNetworkStateAsync().then((state) => setOnline(state.isConnected !== false));
  return () => subscription.remove();
});

// Stale queries refetch when the app comes back to the foreground.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status) =>
    setFocused(status === 'active'),
  );
  return () => subscription.remove();
});
