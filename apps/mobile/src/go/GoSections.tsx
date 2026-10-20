import type { RouteDetail, RouteDetailStep } from '@widoo/shared';
import type { UiIconKey } from '@widoo/tokens';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';
import { analytics } from '../analytics';
import { formatDuration } from '../format/duration';
import { taxonomyLabels } from '../i18n/labels';
import { hoursLine, localTime, transitionText } from '../route/sheetText';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { stepName } from './goText';
import type { GoProgress } from './progress';

interface GoSectionsProps {
  progress: GoProgress;
  /** The full route: hours, booking and creator; null offline before it was read. */
  route: RouteDetail | null;
  now: Date;
}

/** A section of the step: a raised ink card of radius 20, its title at 17 points (E-07). */
function Section({
  icon,
  title,
  children,
}: {
  icon: UiIconKey;
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-12 rounded-section bg-surface-strong-raised p-16">
      <View accessibilityRole="header" accessible className="flex-row items-center gap-8">
        <Icon {...uiIcon(icon)} size="icon-m" color="info-on-strong" />
        <Text variant="title-s" color="on-strong" className="shrink">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Practical({ step, routeId, now }: { step: RouteDetailStep; routeId: string; now: Date }) {
  const { t } = useTranslation();
  const hours = hoursLine(t, step, now);
  const cost = step.costPerPersonEur;
  if (!hours && cost === null && !step.bookingUrl) {
    return null;
  }
  return (
    <Section icon="practical" title={t('go.sections.practical')}>
      {hours &&
        (hours.kind === 'open' ? (
          <Text variant="body" color="on-strong" accessibilityLabel={hours.spoken}>
            <Text variant="body" color="success-on-strong">
              {t('route.step.open')}
            </Text>
            {` ${hours.hours}`}
          </Text>
        ) : (
          <Text variant="body" color="on-strong">
            {hours.text}
          </Text>
        ))}
      {cost !== null && (
        <Text variant="body" color="on-strong">
          {cost === 0 ? t('route.step.costFree') : t('route.step.cost', { euros: cost })}
        </Text>
      )}
      {step.bookingUrl && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('route.step.bookLabel', { place: step.place.name })}
          hitSlop={12}
          className="self-start"
          onPress={() => {
            analytics.track('booking_link_opened', {
              route_id: routeId,
              step_id: step.id,
              provider: step.bookingProvider ?? 'other',
              context: 'go',
            });
            void Linking.openURL(step.bookingUrl as string);
          }}
        >
          <Text variant="body-medium" color="info-on-strong">
            {t('route.step.book')}
          </Text>
        </Pressable>
      )}
    </Section>
  );
}

/**
 * The content of the step under the commands (Ecrans › E-07), in this order: Pratique, the word
 * of the creator, Ensuite; an empty section does not show. No « Écouter » (out of the MVP,
 * D-029); « À ne pas manquer » and « En images » wait for the API to give the highlights and
 * the photos of a step.
 */
export function GoSections({ progress, route, now }: GoSectionsProps) {
  const { t } = useTranslation();
  const { current, next } = progress;
  if (!current) {
    return null;
  }
  const detail = route?.steps.find((step) => step.id === current.step.id);
  const fullStep = detail && !detail.isLocked ? detail : null;
  const creatorName = route?.isOfficial ? 'Widoo' : (route?.author?.firstName ?? 'Widoo');
  const transition = current.step.transition;
  return (
    <>
      {fullStep && <Practical step={fullStep} routeId={route?.id ?? ''} now={now} />}
      {current.step.description && (
        <Section icon="creator-word" title={t('go.sections.word', { name: creatorName })}>
          <Text variant="body" color="on-strong">
            {current.step.description}
          </Text>
        </Section>
      )}
      {next && (
        <Section icon="next-step" title={t('go.sections.next')}>
          <View accessible className="gap-4">
            <Text variant="item" color="on-strong">
              {stepName(next.step)}
            </Text>
            <Text variant="body-s" color="on-strong-muted">
              {t('go.sections.nextStep', {
                category: taxonomyLabels().placeCategories[next.step.place.category],
                duration: formatDuration(t, next.step.durationMin, 'short'),
                time: next.times ? localTime(t, next.times.arrivesAt).short : '',
              })}
            </Text>
          </View>
          {transition && (
            <Text variant="body-s" color="on-strong-muted">
              {transitionText(t, transition).short}
            </Text>
          )}
          {current.step.transitionNote && (
            <View className="gap-4">
              <Text variant="item" color="on-strong">
                {t('go.sections.path', { name: creatorName })}
              </Text>
              <Text variant="body" color="on-strong">
                {current.step.transitionNote}
              </Text>
            </View>
          )}
        </Section>
      )}
    </>
  );
}
