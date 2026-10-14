import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

/**
 * The Widoo Premium card (D-073), ink and gold, for an account that is not a subscriber; it
 * leads to E-17, which does not exist yet: its button is read dimmed until then (#67).
 */
export function PremiumCard() {
  const { t } = useTranslation();
  return (
    <View className="gap-16 rounded-section bg-surface-strong p-16">
      <View className="flex-row items-center gap-8">
        <Icon {...uiIcon('premium')} size="icon-l" />
        <Text variant="title-l" color="on-strong" accessibilityRole="header" className="flex-1">
          {t('profile.premium.title')}
        </Text>
      </View>
      <Text variant="body" color="on-strong">
        {t('profile.premium.body')}
      </Text>
      <Button
        variant="inverse"
        isFullWidth
        isDisabled
        label={t('profile.premium.discover')}
        onPress={() => undefined}
      />
    </View>
  );
}
