import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { capitalize, dateFormat } from '../i18n/formats';
import { DiscButton } from '../ui/DiscButton';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { monthWeeks } from './calendar';

/** How far ahead the calendar goes: a year of months. */
const MONTHS_AHEAD = 12;
/** Monday 2 January 2023 at noon UTC, then the six days after it: the columns of the calendar. */
const weekDays = Array.from(
  { length: 7 },
  (_, index) => new Date(Date.UTC(2023, 0, 2 + index, 12)),
);

const monthOf = (day: string) => ({
  year: Number(day.slice(0, 4)),
  month: Number(day.slice(5, 7)),
});
const indexOf = ({ year, month }: { year: number; month: number }) => year * 12 + month - 1;

interface CalendarStepProps {
  /** The day shown chosen, in ink. */
  selected: string;
  today: string;
  onSelect: (day: string) => void;
  onBack: () => void;
}

/**
 * « Choisir une date », the next step of the sheet (Ecrans › E-06): back to the days, month by
 * month, the days past inactive, the day chosen in ink, each day in a disc of 44 points; read as a
 * grid (« 10 octobre, sélectionné »).
 */
export function CalendarStep({ selected, today, onSelect, onBack }: CalendarStepProps) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(() => monthOf(selected < today ? today : selected));
  const first = indexOf(monthOf(today));
  const current = indexOf(shown);
  const move = (by: number) => {
    const next = current + by;
    setShown({ year: Math.floor(next / 12), month: (next % 12) + 1 });
  };
  const title = capitalize(
    dateFormat({ timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(shown.year, shown.month - 1, 15)),
    ),
  );

  return (
    <View className="gap-16">
      <View className="flex-row items-center gap-8">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('plan.calendar.back')}
          onPress={onBack}
          className="size-disc items-center justify-center"
        >
          <Icon {...uiIcon('back')} size="icon-l" />
        </Pressable>
        <Text variant="title-l" accessibilityRole="header" className="flex-1">
          {t('plan.calendar.title')}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <DiscButton
          icon="back"
          surface="surface"
          accessibilityLabel={t('plan.calendar.previous')}
          isDisabled={current <= first}
          onPress={() => move(-1)}
        />
        <Text variant="title-s" accessibilityRole="header" accessibilityLiveRegion="polite">
          {title}
        </Text>
        <DiscButton
          icon="open-row"
          surface="surface"
          accessibilityLabel={t('plan.calendar.next')}
          isDisabled={current >= first + MONTHS_AHEAD}
          onPress={() => move(1)}
        />
      </View>
      <View role="grid" aria-label={title} className="gap-4">
        <View
          className="flex-row"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {weekDays.map((weekday) => (
            <View key={weekday.getTime()} className="flex-1 items-center">
              {/* « L M M J V S D », « M T W T F S S ». */}
              <Text variant="label-strong" color="muted" isDense>
                {dateFormat({ timeZone: 'UTC', weekday: 'narrow' }).format(weekday)}
              </Text>
            </View>
          ))}
        </View>
        {monthWeeks(shown.year, shown.month).map((week) => (
          <View key={week.find(Boolean) ?? ''} className="flex-row">
            {week.map((day, index) => (
              <View key={day ?? `empty-${index}`} className="flex-1 items-center">
                {day && (
                  <DayCell
                    day={day}
                    isSelected={day === selected}
                    isPast={day < today}
                    onPress={() => onSelect(day)}
                  />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
      <View className="flex-row items-start gap-8">
        <Icon {...uiIcon('info')} size="icon-m" color="muted" />
        <Text variant="body-s" color="muted" className="flex-1">
          {t('plan.calendar.note')}
        </Text>
      </View>
    </View>
  );
}

function DayCell({
  day,
  isSelected,
  isPast,
  onPress,
}: {
  day: string;
  isSelected: boolean;
  isPast: boolean;
  onPress: () => void;
}) {
  const label = dateFormat({ timeZone: 'UTC', day: 'numeric', month: 'long' }).format(
    new Date(`${day}T12:00:00Z`),
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, disabled: isPast }}
      disabled={isPast}
      onPress={onPress}
      className={`size-disc items-center justify-center rounded-pill ${isSelected ? 'bg-surface-strong' : ''}`}
    >
      {/* Dense: the days stay in their discs of 44 points at large text sizes (D-039). */}
      <Text
        variant="body-medium"
        isDense
        color={isSelected ? 'on-strong' : isPast ? 'control-border-disabled' : 'ink'}
      >
        {Number(day.slice(8, 10))}
      </Text>
    </Pressable>
  );
}
