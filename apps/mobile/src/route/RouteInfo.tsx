import { type RouteDetail } from '@widoo/shared';
import { filterIcons, type UiIconKey } from '@widoo/tokens';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatBudget } from '../format/budget';
import { formatDistance } from '../format/distance';
import { InfoChip } from '../ui/Chip';
import { Icon, uiIcon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import { taxonomyLabels } from '../i18n/labels';

/** Lines of the description before « Lire la suite » (Ecrans › E-05, haut). */
const DESCRIPTION_LINES = 3;

/** The description, cut on three lines until « Lire la suite » unfolds it in place. */
export function Description({ text }: { text: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCut, setIsCut] = useState(false);
  return (
    <View className="gap-4">
      <Text variant="body" numberOfLines={isOpen ? undefined : DESCRIPTION_LINES}>
        {text}
      </Text>
      {/* The whole text, laid out out of sight: whether three lines cut it. */}
      <Text
        variant="body"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="opacity-0"
        style={styles.measure}
        onTextLayout={(event) => setIsCut(event.nativeEvent.lines.length > DESCRIPTION_LINES)}
      >
        {text}
      </Text>
      {!isOpen && isCut && (
        <TextLink label={t('route.readMore')} role="button" onPress={() => setIsOpen(true)} />
      )}
    </View>
  );
}

/** The description loading: grey bars, without spinner, announced busy (M-09). */
export function DescriptionSkeleton() {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityLabel={t('route.loadingDescription')}
      accessibilityState={{ busy: true }}
      className="gap-12 py-4"
    >
      {/* Three lines of text, the last one shorter, as the maquette draws them. */}
      <Skeleton className="h-12 rounded-pill" />
      <Skeleton className="h-12 rounded-pill" style={{ width: '92%' }} />
      <Skeleton className="h-12 rounded-pill" style={{ width: '60%' }} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="title-s" accessibilityRole="header">
      {children}
    </Text>
  );
}

function PracticalRow({
  icon,
  label,
  value,
  spoken = value,
}: {
  icon: UiIconKey | null;
  label: string;
  value: string;
  /** What a screen reader says of the value, when it differs. */
  spoken?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${spoken}`}
      className="flex-row flex-wrap items-center gap-12 border-t border-line py-12"
    >
      {icon ? <Icon {...uiIcon(icon)} size="icon-m" /> : <View className="size-icon-m" />}
      <Text variant="body-medium" className="shrink">
        {label}
      </Text>
      <Text variant="item" className="ml-auto text-right">
        {value}
      </Text>
    </View>
  );
}

/**
 * « Pour qui » and « Conditions » in the chips and icons of the filter panel, read only; the
 * accessibility limit said plainly when the route is not for a wheelchair; « En pratique » in
 * rows: walk, effort, access by transport, budget.
 */
export function RouteInfo({ route }: { route: RouteDetail }) {
  const { t } = useTranslation();
  const budget = formatBudget(t, route);
  return (
    <View className="gap-24">
      {route.audiences.length > 0 && (
        <View className="gap-12">
          <SectionTitle>{t('route.audiences')}</SectionTitle>
          <View className="flex-row flex-wrap gap-8">
            {route.audiences.map((audience) => (
              <InfoChip
                key={audience}
                label={taxonomyLabels().audiences[audience]}
                icon={filterIcons.audiences[audience]}
              />
            ))}
          </View>
        </View>
      )}
      <View className="gap-12">
        <SectionTitle>{t('route.conditions')}</SectionTitle>
        {route.conditions.length > 0 && (
          <View className="flex-row flex-wrap gap-8">
            {route.conditions.map((condition) => (
              <InfoChip
                key={condition}
                label={taxonomyLabels().conditions[condition]}
                icon={filterIcons.conditions[condition]}
              />
            ))}
          </View>
        )}
        {!route.conditions.includes('wheelchair') && (
          <View accessible className="flex-row items-start gap-8">
            <Icon {...uiIcon('info')} size="icon-s" color="muted" />
            <Text variant="body-s" color="muted" className="shrink">
              {t('route.notWheelchair')}
            </Text>
          </View>
        )}
      </View>
      <View>
        <View className="pb-12">
          <SectionTitle>{t('route.practical')}</SectionTitle>
        </View>
        <PracticalRow
          icon="distance"
          label={t('route.walk')}
          value={formatDistance(t, route.walkingDistanceM, 'short')}
          spoken={formatDistance(t, route.walkingDistanceM, 'spoken')}
        />
        {/* No interface icon names the effort in tokens.json: the row keeps its place. */}
        <PracticalRow
          icon={null}
          label={t('route.effort')}
          value={t(`route.efforts.${route.effort}`)}
        />
        {route.startAccess && (
          <PracticalRow
            icon={null}
            label={t('route.access')}
            value={t('route.accessValue', {
              station: route.startAccess.station,
              lines: route.startAccess.lines.join(', '),
            })}
          />
        )}
        <PracticalRow
          icon="budget"
          label={t('route.budget')}
          value={budget.perPerson ? `${budget.amount} ${budget.perPerson}` : budget.amount}
          spoken={budget.spoken}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Unbounded below, so that every line of the text is laid out.
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
});
