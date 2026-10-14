import type { UiIconKey } from '@widoo/tokens';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { clockOf, planMinuteOf } from './calendar';
import type { PlanNotice as Notice } from './notice';
import { dateOfMonth, fullDayName, weekdayName } from './planText';

interface PlanNoticeProps {
  notice: Notice;
  today: string;
  /** The start or the day a suggestion sets. */
  onMinute: (minute: number) => void;
  onDay: (day: string) => void;
}

/**
 * The opening of the places for the start chosen (Ecrans › E-06): the green line when all are
 * open, told as a status at each change; else the amber alert, told when it appears, with what
 * avoids it, aligned right (D-039). One can plan anyway.
 */
export function PlanNotice({ notice, today, onMinute, onDay }: PlanNoticeProps) {
  const { t } = useTranslation();
  if (notice.kind === 'open') {
    const time = clockOf(planMinuteOf(notice.endsAt));
    const text = t(`plan.open.${notice.hours}`, { time });
    return <OpenLine text={text} />;
  }
  if (notice.kind === 'closedAtArrival') {
    const { hours, suggestion } = notice;
    return (
      <Alert
        icon="alert"
        title={t('plan.closedAtArrival.title', { place: notice.place })}
        body={
          hours
            ? t(`plan.closedAtArrival.${hours.relation}`, {
                arrival: notice.arrival,
                time: hours.time,
              })
            : null
        }
        action={
          suggestion === null
            ? null
            : {
                icon: 'suggested-time',
                label: t('plan.closedAtArrival.suggest', { time: clockOf(suggestion) }),
                onPress: () => onMinute(suggestion),
              }
        }
      />
    );
  }
  if (notice.kind === 'closedThatDay') {
    const { nextDay } = notice;
    return (
      <Alert
        icon="closed-today"
        title={t('plan.closedThatDay.title', { place: notice.place })}
        body={t('plan.closedThatDay.body', { weekday: weekdayName(notice.day) })}
        action={
          nextDay
            ? {
                icon: 'other-date',
                label: t('plan.chooseDay', { day: fullDayName(nextDay, today) }),
                onPress: () => onDay(nextDay),
              }
            : null
        }
      />
    );
  }
  const { lastDay } = notice;
  return (
    <Alert
      icon="ends"
      title={t('plan.ended.title')}
      body={t('plan.ended.body', {
        place: notice.place,
        endsOn: fullDayName(notice.endsOn, today),
        date: dateOfMonth(notice.day),
      })}
      action={
        lastDay
          ? {
              icon: 'other-date',
              label: t('plan.chooseDay', { day: fullDayName(lastDay, today) }),
              onPress: () => onDay(lastDay),
            }
          : null
      }
    />
  );
}

/** « Fin vers 17:00. Tous les lieux seront ouverts. », in green, told as a status. */
function OpenLine({ text }: { text: string }) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  return (
    <View
      accessible
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      className="flex-row items-start gap-8"
    >
      <Icon {...uiIcon('done')} size="icon-m" color="green-ink" />
      <Text variant="body-medium" color="green-ink" className="flex-1">
        {text}
      </Text>
    </View>
  );
}

interface AlertAction {
  icon: UiIconKey;
  label: string;
  onPress: () => void;
}

/**
 * The amber alert (`alert` on `alert-soft`, 5.36:1): title, the reason, and its suggestion as an
 * underlined link on the right, which goes under the text and stays right when it wraps.
 */
function Alert({
  icon,
  title,
  body,
  action,
}: {
  icon: UiIconKey;
  title: string;
  body: string | null;
  action: AlertAction | null;
}) {
  const spoken = body ? `${title}. ${body}` : title;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);
  return (
    <View className="gap-12 rounded-block bg-alert-soft p-16">
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLabel={spoken}
        className="flex-row items-start gap-12"
      >
        <Icon
          {...uiIcon(icon)}
          // « warning plein » (`mappings.planning.closedAlert`); the hourglass stays in outline.
          weight={icon === 'alert' ? 'fill' : uiIcon(icon).weight}
          size="icon-l"
          color="alert"
        />
        <View className="flex-1 gap-4">
          <Text variant="item" color="alert">
            {title}
          </Text>
          {body && (
            <Text variant="body-s" color="alert">
              {body}
            </Text>
          )}
        </View>
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          className="min-h-touch-min flex-row items-center justify-end gap-6 self-end"
        >
          <Icon {...uiIcon(action.icon)} size="icon-m" color="alert" weight="bold" />
          <Text variant="button" color="alert" className="shrink underline">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
