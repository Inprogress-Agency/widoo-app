import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { useIsLargeText } from '../ui/useIsLargeText';

interface DateCardProps {
  day: string;
  hours: string;
  spoken: string;
  /** « Changer », which reopens E-06; null while the route is not read. */
  onChange: (() => void) | null;
}

/**
 * The card of date of « Votre sortie » (Ecrans › E-08): « Samedi 26 septembre », « Départ 10:00,
 * fin vers 17:00 », read as one element, and « Changer » in blue ink on warm grey on its right;
 * at large text, under the date, on the right (side of the thumb, D-039).
 */
export function DateCard({ day, hours, spoken, onChange }: DateCardProps) {
  const { t } = useTranslation();
  const isLargeText = useIsLargeText();
  const change = onChange && (
    <TextLink
      label={t('routes.outing.change')}
      accessibilityLabel={t('routes.outing.changeSpoken')}
      role="button"
      color="blue-ink"
      onPress={onChange}
    />
  );
  return (
    <View className="flex-row items-center gap-16 rounded-section bg-surface p-16">
      <Icon {...uiIcon('plan-date')} size="icon-l" />
      <View className="flex-1 gap-8">
        <View accessible accessibilityLabel={spoken} className="gap-4">
          <Text variant="title-s">{day}</Text>
          <Text variant="body" color="muted">
            {hours}
          </Text>
        </View>
        {isLargeText && change && <View className="items-end">{change}</View>}
      </View>
      {!isLargeText && change}
    </View>
  );
}
