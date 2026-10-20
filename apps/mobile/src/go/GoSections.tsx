import type { Photo, RouteDetail, RouteDetailStep } from '@widoo/shared';
import { motion, spacing, type UiIconKey } from '@widoo/tokens';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { analytics } from '../analytics';
import { formatDuration } from '../format/duration';
import { taxonomyLabels } from '../i18n/labels';
import { hoursLine, localTime, transitionText } from '../route/sheetText';
import { Icon, uiIcon } from '../ui/Icon';
import { PhotoCredit } from '../ui/PhotoCredit';
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

/** « À ne pas manquer »: one to three points, numbered, each read as one element with its number. */
function MustSee({ highlights }: { highlights: readonly string[] }) {
  const { t } = useTranslation();
  if (highlights.length === 0) {
    return null;
  }
  return (
    <Section icon="must-see" title={t('go.sections.mustSee')}>
      {highlights.map((point, index) => (
        <View key={`${index}:${point}`} accessible className="flex-row gap-16">
          <Text variant="number-l" color="info-on-strong" style={{ minWidth: spacing['space-24'] }}>
            {index + 1}
          </Text>
          <Text variant="body-medium" color="on-strong" className="shrink">
            {point}
          </Text>
        </View>
      ))}
    </Section>
  );
}

/** A photo of « En images », measured on the mockup (Ecrans › E-07, contenu, suite). */
const GALLERY_PHOTO = { width: 220, height: 160 };

/**
 * « En images »: up to five photos swiped sideways, past the margins of the page, the credit of a
 * free photo at its bottom right (D-052). Not a card: its title and count sit on the page. Each
 * photo is read « Photo 1 sur 5 », then its credit, a button.
 */
function InPictures({ photos }: { photos: readonly Photo[] }) {
  const { t } = useTranslation();
  const count = photos.length;
  if (count === 0) {
    return null;
  }
  return (
    <View className="gap-12">
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-8">
        <Text variant="title-s" color="on-strong" accessibilityRole="header" className="shrink">
          {t('go.sections.images')}
        </Text>
        <Text variant="body-s" color="on-strong-muted">
          {t('go.sections.photoCount', { count })}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Past the side margin of the page (`GoPage`, 20 points), to the edges of the screen.
        className="-mx-20"
        contentContainerClassName="gap-10 px-20"
      >
        {photos.map((photo, index) => (
          <View key={`${index}:${photo.url}`}>
            <Image
              source={{ uri: photo.url }}
              contentFit="cover"
              transition={motion.durations.fade}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('go.sections.photo', { position: index + 1, count })}
              accessibilityIgnoresInvertColors
              className="rounded-block bg-surface-strong-raised"
              style={GALLERY_PHOTO}
            />
            {photo.credit && (
              <View className="absolute bottom-8 right-8">
                <PhotoCredit credit={photo.credit} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * The content of the step under the commands (Ecrans › E-07), in this order: Pratique, the word
 * of the creator, À ne pas manquer, En images, Ensuite; an empty section does not show. No
 * « Écouter » (out of the MVP, D-029). The points and the photos come with the planning, kept on
 * the phone: they show offline too.
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
      <MustSee highlights={current.step.highlights} />
      <InPictures photos={current.step.photos} />
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
