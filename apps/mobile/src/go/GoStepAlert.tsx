import { size } from '@widoo/tokens';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { stepAlertText, stepName } from './goText';
import type { GoProgress } from './progress';

// The link is shorter than a finger: its hit slop brings it to 44 points (E-07).
const hitSlop = size['touch-min'] / 4;

interface GoStepAlertProps {
  progress: GoProgress;
  /** « Passer cette étape », from the late alert. */
  onSkip: () => void;
}

/**
 * The step alert of E-07 (`mappings.immersive.stepAlert`), over the title: the step of the moment
 * will be closed on arrival, or leave less than half of its time (« Café Lomi ferme à 16:00 »,
 * « Vous arriverez vers 15:50, il restera 10 min. »), with « Passer cette étape ». Alert ink on
 * `alert-soft`, radius 16; it grows with the text, its link on its own line. Told once per step
 * as it appears.
 */
export function GoStepAlert({ progress, onSkip }: GoStepAlertProps) {
  const { t } = useTranslation();
  const { alert, current } = progress;
  const text = alert && current ? stepAlertText(t, current.step, alert) : null;
  const told = useRef<string | null>(null);
  useEffect(() => {
    if (text && current && told.current !== current.step.id) {
      told.current = current.step.id;
      AccessibilityInfo.announceForAccessibility(text.spoken);
    }
  }, [current, text]);
  if (!alert || !current || !text) {
    return null;
  }
  return (
    <View className="gap-12 rounded-block bg-alert-soft p-16">
      <View accessible accessibilityLabel={text.spoken} className="flex-row gap-12">
        <Icon name={alert.kind === 'closed' ? 'warning' : 'clock'} weight="fill" color="alert" />
        <View className="shrink gap-4">
          <Text variant="title-s" color="alert">
            {text.title}
          </Text>
          <Text variant="body" color="alert">
            {text.body}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('go.skip.actionLabel', { place: stepName(current.step) })}
        hitSlop={hitSlop}
        onPress={onSkip}
        className="flex-row items-center gap-8 self-start pl-32"
      >
        <Icon name="play" weight="fill" size="icon-s" color="alert" />
        <Text variant="button" color="alert" className="shrink underline">
          {t('go.skip.action')}
        </Text>
      </Pressable>
    </View>
  );
}
