import { motion } from '@widoo/tokens';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useRouteSheet } from '../route/useRouteSheet';
import { Icon, uiIcon } from '../ui/Icon';

interface RoutePhotoProps {
  /** Null once the route is deleted: the planning keeps its snapshot, without photo. */
  routeId: string | null;
  className: string;
  children?: React.ReactNode;
}

function Cover({ uri }: { uri: string | null }) {
  return uri ? (
    <Image
      source={{ uri }}
      contentFit="cover"
      transition={motion.durations.fade}
      style={StyleSheet.absoluteFill}
    />
  ) : (
    <View className="flex-1 items-center justify-center">
      <Icon {...uiIcon('map')} size="icon-l" color="muted" />
    </View>
  );
}

function SheetCover({ routeId }: { routeId: string }) {
  const { state } = useRouteSheet(routeId);
  const uri =
    state.status === 'ready'
      ? state.route.coverUrl
      : 'known' in state
        ? state.known?.coverUrl
        : null;
  return <Cover uri={uri ?? null} />;
}

/**
 * The cover of a route of E-08, from its sheet, which the planning does not carry; a map icon
 * on warm grey meanwhile, or without photo. Decorative: the line says the route.
 */
export function RoutePhoto({ routeId, className, children }: RoutePhotoProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`overflow-hidden bg-skeleton ${className}`}
    >
      {routeId ? <SheetCover routeId={routeId} /> : <Cover uri={null} />}
      {children}
    </View>
  );
}
