import type { RouteDetailStep } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { SectionTitle } from './PlanControls';

interface ChecklistProps {
  /** The steps with a booking, in step order: the checklist of `POST /me/planned`. */
  bookings: readonly RouteDetailStep[];
  checked: ReadonlySet<string>;
  onToggle: (step: RouteDetailStep) => void;
  onBook: (step: RouteDetailStep) => void;
}

/**
 * « À préparer », always before the programme (Ecrans › E-06): one box of 24 points per booking
 * advised, its detail (« Conseillé le week-end, 15 € par pers. »), « Réserver » to the site of the
 * place on the right, which goes under the label at large text sizes, and « Lien affilié » under
 * it (D-052); the counter « 1 sur 2 ».
 */
export function Checklist({ bookings, checked, onToggle, onBook }: ChecklistProps) {
  const { t } = useTranslation();
  if (bookings.length === 0) {
    return null;
  }
  const values = {
    done: bookings.filter((step) => checked.has(step.id)).length,
    total: bookings.length,
  };
  return (
    <View className="gap-4">
      <SectionTitle
        title={t('plan.toPrepare')}
        value={t('plan.progress', values)}
        spoken={t('plan.progressSpoken', values)}
      />
      <View className="border-line" style={styles.top}>
        {bookings.map((step, index) => (
          <BookingRow
            key={step.id}
            step={step}
            isChecked={checked.has(step.id)}
            isLast={index === bookings.length - 1}
            onToggle={() => onToggle(step)}
            onBook={() => onBook(step)}
          />
        ))}
      </View>
    </View>
  );
}

function BookingRow({
  step,
  isChecked,
  isLast,
  onToggle,
  onBook,
}: {
  step: RouteDetailStep;
  isChecked: boolean;
  isLast: boolean;
  onToggle: () => void;
  onBook: () => void;
}) {
  const { t } = useTranslation();
  const label = t('plan.book', { place: step.title ?? step.place.name });
  const cost = step.costPerPersonEur
    ? t('route.step.cost', { euros: step.costPerPersonEur })
    : null;
  const detail = [step.bookingNote, cost].filter(Boolean).join(', ');
  return (
    <View
      className={`flex-row flex-wrap items-center justify-end gap-x-12 gap-y-4 border-line py-12 ${isLast ? '' : 'border-b'}`}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={detail ? `${label}, ${detail}` : label}
        accessibilityState={{ checked: isChecked }}
        onPress={onToggle}
        className="min-h-touch-min flex-row items-center gap-16"
        style={styles.row}
      >
        <View
          className={`size-24 items-center justify-center rounded-thumb border-2 ${isChecked ? 'border-blue bg-blue' : 'border-control-border'}`}
        >
          {isChecked && <Icon name="check" size="icon-s" color="on-blue" weight="bold" />}
        </View>
        <View className="flex-1">
          <Text variant="item">{label}</Text>
          {detail !== '' && (
            <Text variant="body-s" color="muted">
              {detail}
            </Text>
          )}
        </View>
      </Pressable>
      {step.bookingUrl && (
        <View className="items-end">
          <TextLink
            label={t('plan.bookLink')}
            icon="external"
            accessibilityLabel={t('plan.bookLinkLabel', { place: step.place.name })}
            accessibilityHint={t('plan.bookHint')}
            onPress={onBook}
          />
          {step.bookingIsAffiliate && (
            <Text variant="caption" color="muted">
              {t('plan.affiliate')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { borderTopWidth: StyleSheet.hairlineWidth },
  // The box and its label take the room left by « Réserver », down to 60 % of the row.
  row: { flexGrow: 1, flexBasis: '60%' },
});
