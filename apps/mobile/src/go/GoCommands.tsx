import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { stepName } from './goText';
import type { GoProgress } from './progress';

interface GoCommandsProps {
  progress: GoProgress;
  onDirections: () => void;
  onArrived: () => void;
  onNext: () => void;
  onFinish: () => void;
}

/**
 * A command of E-07, 52 points high at least, as wide as its label (D-034): white for the action
 * of the moment, glass (`toast-action`) for « Itinéraire ».
 */
function Command({
  label,
  accessibilityLabel,
  icon,
  isPrimary,
  isWide = false,
  role = 'button',
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  icon: 'itinerary' | 'arrived' | 'next-step' | 'finish';
  isPrimary: boolean;
  isWide?: boolean;
  role?: 'button' | 'link';
  onPress: () => void;
}) {
  const color = isPrimary ? 'ink' : 'on-strong';
  const glyph =
    icon === 'finish' ? (
      <Icon name="flag" weight="fill" size="icon-m" color={color} />
    ) : (
      <Icon {...uiIcon(icon)} size="icon-m" color={color} />
    );
  const isIconAfter = icon === 'itinerary' || icon === 'next-step';
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={`min-h-button-l-h grow flex-row items-center justify-center gap-8 rounded-pill px-24 py-12 ${isPrimary ? 'bg-on-strong' : 'bg-toast-action'} ${isWide ? 'w-full' : ''}`}
    >
      {!isIconAfter && glyph}
      <Text variant="button-l" color={color} className="shrink text-center">
        {label}
      </Text>
      {isIconAfter && glyph}
    </Pressable>
  );
}

/**
 * The commands of the moment (Ecrans › E-07), order and style fixed: en route, « Itinéraire » on
 * the left and « J'y suis » on the right, in `wrap-reverse` so that J'y suis goes above when they
 * no longer fit side by side, the reading order unchanged; on site, « Étape suivante : … », or
 * « Terminer la sortie » on the last step.
 */
export function GoCommands({
  progress,
  onDirections,
  onArrived,
  onNext,
  onFinish,
}: GoCommandsProps) {
  const { t } = useTranslation();
  const { current, next, phase } = progress;
  if (!current) {
    return (
      <Command
        label={t('go.finish')}
        accessibilityLabel={t('go.finish')}
        icon="finish"
        isPrimary
        isWide
        onPress={onFinish}
      />
    );
  }
  const place = stepName(current.step);
  if (phase === 'on_site') {
    return next ? (
      <Command
        label={t('go.next', { place: stepName(next.step) })}
        accessibilityLabel={t('go.next', { place: stepName(next.step) })}
        icon="next-step"
        isPrimary
        isWide
        onPress={onNext}
      />
    ) : (
      <Command
        label={t('go.finish')}
        accessibilityLabel={t('go.finish')}
        icon="finish"
        isPrimary
        isWide
        onPress={onFinish}
      />
    );
  }
  return (
    <View className="flex-row gap-12" style={{ flexWrap: 'wrap-reverse' }}>
      <Command
        label={t('go.directions')}
        accessibilityLabel={t('go.directionsLabel', { place })}
        icon="itinerary"
        isPrimary={false}
        role="link"
        onPress={onDirections}
      />
      <Command
        label={t('go.arrived')}
        accessibilityLabel={t('go.arrivedLabel', { place })}
        icon="arrived"
        isPrimary
        onPress={onArrived}
      />
    </View>
  );
}
