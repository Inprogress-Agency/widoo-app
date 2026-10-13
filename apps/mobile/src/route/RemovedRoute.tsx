import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusMessage } from '../components/StatusMessage';
import { Button } from '../ui/Button';
import { DiscButton } from '../ui/DiscButton';
import { parisDay, withoutFinalDot } from './sheetText';

interface RemovedRouteProps {
  removedAt: string;
  onClose: () => void;
  /** « Voir des parcours proches »: the home around its zone. */
  onNearby: () => void;
}

/**
 * A withdrawn route (D-014), opened from a link or a notification: no photo nor bar; the eye
 * crossed out, « Ce parcours n'est plus disponible », the date of the withdrawal, and « Voir des
 * parcours proches ». « Retirer des favoris » comes with the favorites (#39).
 */
export function RemovedRoute({ removedAt, onClose, onNearby }: RemovedRouteProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg px-16" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View className="py-8">
        <DiscButton
          icon="close-sheet"
          surface="surface"
          accessibilityLabel={t('route.close')}
          onPress={onClose}
        />
      </View>
      <View className="flex-1 justify-center pb-32">
        <StatusMessage
          icon="removed"
          title={t('route.removed.title')}
          body={t('route.removed.body', { date: withoutFinalDot(parisDay(removedAt)) })}
          action={<Button label={t('route.removed.nearby')} onPress={onNearby} />}
        />
      </View>
    </View>
  );
}
