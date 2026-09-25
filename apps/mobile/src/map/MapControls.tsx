import { size } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

// The link text is shorter than a finger: its hit slop brings it to 44 points.
const linkHitSlop = size['touch-min'] / 4;

/** White disc that brings the map back on the user, or on Paris without position (E-01). */
export function RecenterButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('map.recenter')}
      onPress={onPress}
      className="size-disc items-center justify-center rounded-pill bg-bg"
    >
      <Icon {...uiIcon('recenter')} />
    </Pressable>
  );
}

/**
 * Discreet line when the position is off: the map shows Paris, « Activer » asks again, or opens
 * the settings once the system no longer asks (Ecrans › E-01, géolocalisation refusée).
 */
export function LocationOffBanner({ onEnable }: { onEnable: () => void }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="min-h-touch-min flex-row items-center gap-8 rounded-block bg-surface px-12 py-8"
    >
      <Icon {...uiIcon('location-off')} size="space-16" color="muted" />
      <Text variant="label" color="muted" className="flex-1">
        {t('map.locationOff')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('map.enableLocation')}
        hitSlop={linkHitSlop}
        onPress={onEnable}
      >
        <Text variant="label-strong" color="blue-ink">
          {t('map.enable')}
        </Text>
      </Pressable>
    </View>
  );
}
