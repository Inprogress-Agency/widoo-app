import { immersive, shadow } from '@widoo/tokens';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { miniPlayerLabel, statusText, stepName } from './goText';
import { useGo } from './useGo';

/**
 * The mini-player (Ecrans › E-07, M-11): the route under way folded into an ink bar of 64 points
 * over the tab bar, on every tab; status, name of the step on one line, thin progress. A tap
 * opens E-07 again. Dense: capped at 1.3, the whole name in its label (D-034).
 */
export function MiniPlayer() {
  const { t } = useTranslation();
  const { planned, progress } = useGo();
  if (!planned || !progress) {
    return null;
  }
  const { current, doneCount, total } = progress;
  return (
    <View className="w-full px-16">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={miniPlayerLabel(t, progress)}
        onPress={() => router.push('/go')}
        className="w-full overflow-hidden rounded-section bg-surface-strong"
        style={{ minHeight: immersive.miniPlayer.height, boxShadow: shadow['shadow-tabbar'] }}
      >
        <View className="flex-1 flex-row items-center gap-12 px-16 py-10">
          <View className="flex-1 gap-4">
            <Text variant="status" color="on-strong-muted" isDense numberOfLines={1}>
              {statusText(t, progress).short}
            </Text>
            <Text variant="item" color="on-strong" isDense numberOfLines={1}>
              {current ? stepName(current.step) : planned.route.title}
            </Text>
          </View>
          <Icon name="caret-up" size="icon-m" color="on-strong" />
        </View>
        <View className="h-4 bg-toast-action">
          <View
            className="h-4 bg-on-strong"
            style={{ width: `${(doneCount / Math.max(total, 1)) * 100}%` }}
          />
        </View>
      </Pressable>
    </View>
  );
}
