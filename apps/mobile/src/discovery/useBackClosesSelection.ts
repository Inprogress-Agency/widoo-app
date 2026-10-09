import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { selectedRoute } from './store';
import { useDiscovery } from './useRouteSearch';

/**
 * Android Back over a selected route (Ecrans › E-04 › Retour Android, D-083): the selection
 * closes exactly as on a tap elsewhere on the map, a touched step tooltip with it, in one press.
 * Without a selection, or while the home is not the screen shown (« Voir tout », a route page),
 * Back is the system's. iOS has no Back button: the listener never fires there.
 */
export function useBackClosesSelection() {
  const isSelected = useDiscovery((state) => selectedRoute(state) !== null);
  const select = useDiscovery((state) => state.select);
  useFocusEffect(
    useCallback(() => {
      if (!isSelected) {
        return;
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        select(null);
        return true;
      });
      return () => subscription.remove();
    }, [isSelected, select]),
  );
}
