import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { Chip } from '../ui/Chip';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { addDays, clockOf, LAST_TIME_MIN, TIME_STEP_MIN } from './calendar';
import { dayChipText, isProposedDay, PROPOSED_DAYS } from './planText';

/**
 * A section title of the sheet, its value on the right (« 1 sur 2 », « Départ 10:00, fin vers
 * 17:00 »), which goes under it when room lacks (`flexWrap`, D-039).
 */
export function SectionTitle({
  title,
  value,
  spoken,
}: {
  title: string;
  value?: string;
  spoken?: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={value ? `${title}, ${spoken ?? value}` : title}
      className="flex-row flex-wrap items-baseline justify-between gap-x-16 gap-y-4"
    >
      <Text variant="title-m">{title}</Text>
      {value && (
        <Text variant="body-medium" color="muted">
          {value}
        </Text>
      )}
    </View>
  );
}

interface DayChipsProps {
  day: string;
  today: string;
  onChange: (day: string) => void;
  /** « Autre date », or the day chosen in the calendar, which opens it again. */
  onOtherDate: () => void;
}

/**
 * « Quel jour ? »: today, tomorrow, the day after and « Autre date », on two rows at large text
 * sizes; the day chosen in ink with a check (`Chip isActive`), told « sélectionné ».
 */
export function DayChips({ day, today, onChange, onOtherDate }: DayChipsProps) {
  const { t } = useTranslation();
  const proposed = Array.from({ length: PROPOSED_DAYS }, (_, index) => addDays(today, index));
  const isOther = !isProposedDay(day, today);
  const other = dayChipText(t, day, today);
  return (
    <View className="gap-12">
      <SectionTitle title={t('plan.day')} />
      <View className="flex-row flex-wrap gap-8">
        {proposed.map((candidate) => {
          const text = dayChipText(t, candidate, today);
          return (
            <Chip
              key={candidate}
              label={text.label}
              accessibilityLabel={text.spoken}
              surface="surface"
              isActive={candidate === day}
              onPress={() => onChange(candidate)}
            />
          );
        })}
        <Chip
          label={isOther ? other.label : t('plan.otherDate')}
          accessibilityLabel={isOther ? other.spoken : t('plan.otherDate')}
          icon={isOther ? undefined : uiIcon('other-date').name}
          surface="surface"
          isActive={isOther}
          onPress={onOtherDate}
        />
      </View>
    </View>
  );
}

interface TimeStepperProps {
  minute: number;
  /** The first time still to come: today, one cannot plan in the past. */
  minMinute: number;
  onChange: (minute: number) => void;
}

/**
 * « Départ »: the time in the middle of a warm grey pill, minus and plus by 15 minutes on white
 * discs of 44 points; the new time is told to screen readers.
 */
export function TimeStepper({ minute, minMinute, onChange }: TimeStepperProps) {
  const { t } = useTranslation();
  const time = clockOf(minute);
  const isFirst = useRef(true);
  useEffect(() => {
    // Told at each change, not at the opening, where the dialog is read first.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    AccessibilityInfo.announceForAccessibility(t('plan.startSpoken', { time }));
  }, [t, time]);
  return (
    <View className="gap-12">
      <SectionTitle title={t('plan.start')} />
      <View
        role="group"
        aria-label={t('plan.startGroup')}
        className="flex-row items-center rounded-pill bg-surface p-6"
      >
        <StepButton
          icon="earlier"
          label={t('plan.earlier')}
          isDisabled={minute - TIME_STEP_MIN < minMinute}
          onPress={() => onChange(minute - TIME_STEP_MIN)}
        />
        <Text
          variant="title-xl"
          className="flex-1 text-center"
          accessibilityLabel={t('plan.startSpoken', { time })}
        >
          {time}
        </Text>
        <StepButton
          icon="later"
          label={t('plan.later')}
          isDisabled={minute + TIME_STEP_MIN > LAST_TIME_MIN}
          onPress={() => onChange(minute + TIME_STEP_MIN)}
        />
      </View>
    </View>
  );
}

function StepButton({
  icon,
  label,
  isDisabled,
  onPress,
}: {
  icon: 'earlier' | 'later';
  label: string;
  isDisabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      className="size-disc items-center justify-center rounded-pill bg-bg"
    >
      <Icon
        {...uiIcon(icon)}
        size="icon-l"
        weight="bold"
        color={isDisabled ? 'control-border-disabled' : 'ink'}
      />
    </Pressable>
  );
}
