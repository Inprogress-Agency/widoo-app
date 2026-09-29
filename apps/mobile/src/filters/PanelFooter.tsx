import { colors, size } from '@widoo/tokens';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, Pressable, View } from 'react-native';
import type { FilterCount, Suggestion } from '../discovery/filterCount';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { spokenFilterLabel, filterLabel } from './filterChip';

/**
 * Base width of « Voir N parcours » (Ecrans › E-03, texte agrandi): beside « Réinitialiser » at
 * 100 %, it rises above it at full width as soon as both no longer fit, without any branch on the
 * font scale.
 */
const BUTTON_BASIS = 220;

interface PanelFooterProps {
  count: FilterCount;
  onApply: () => void;
  onReset: () => void;
  onRemoveGroup: (suggestion: Suggestion) => void;
}

/**
 * Bar stuck at the foot of the panel: the state of the count, the suggestions of the zero result,
 * « Réinitialiser » and the button, in a row that wraps in reverse (`wrap-reverse`).
 */
export function PanelFooter({ count, onApply, onReset, onRemoveGroup }: PanelFooterProps) {
  const { t } = useTranslation();
  const isNone = count.status === 'counted' && count.count === 0;
  const status = statusLine(count, t);
  useAnnounce(status?.text ?? (isNone ? t('filters.noneStatus') : null));
  useAnnounceCount(count);
  return (
    <View className="gap-12 border-t border-line bg-bg px-16 pb-8 pt-12">
      {status && (
        <View className="flex-row items-center gap-8">
          <Icon {...uiIcon(status.icon)} size="icon-s" color="muted" />
          <Text variant="label" color="muted" className="shrink">
            {status.text}
          </Text>
        </View>
      )}
      {isNone && (
        <View className="gap-8">
          <Text variant="body-medium">
            {`${t('filters.noneStatus')} ${t('filters.tryRemoving')}`}
          </Text>
          <View className="flex-row flex-wrap gap-8">
            {count.suggestions.map((suggestion) => (
              <SuggestionChip
                key={suggestion.group}
                suggestion={suggestion}
                onPress={() => onRemoveGroup(suggestion)}
              />
            ))}
          </View>
        </View>
      )}
      <View className="flex-row flex-wrap-reverse items-center justify-center gap-x-16 gap-y-8">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('filters.resetLabel')}
          onPress={onReset}
          className="min-h-touch-min justify-center"
        >
          <Text variant="button-l" className="underline">
            {t('filters.reset')}
          </Text>
        </Pressable>
        <CountButton count={count} onPress={onApply} />
      </View>
    </View>
  );
}

function statusLine(
  count: FilterCount,
  t: ReturnType<typeof useTranslation>['t'],
): { icon: 'offline' | 'error'; text: string } | null {
  if (count.status === 'offline') {
    return { icon: 'offline', text: t('filters.offline') };
  }
  if (count.status === 'unavailable') {
    return { icon: 'error', text: t('filters.unavailable') };
  }
  return null;
}

/**
 * « Voir N parcours »: blue and usable while counting (a spinner, « Calcul en cours »), without
 * number when the count is unavailable or offline, grey and disabled at zero.
 */
function CountButton({ count, onPress }: { count: FilterCount; onPress: () => void }) {
  const { t } = useTranslation();
  const isNone = count.status === 'counted' && count.count === 0;
  const isCounting = count.status === 'counting';
  const label =
    count.status === 'counted'
      ? isNone
        ? t('filters.none')
        : t('filters.show', { count: count.count })
      : isCounting
        ? t('filters.counting')
        : t('filters.showAll');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isCounting ? t('filters.countingLabel') : label}
      accessibilityState={{ disabled: isNone, busy: isCounting }}
      disabled={isNone}
      onPress={onPress}
      className={`min-h-button-l-h grow flex-row items-center justify-center gap-8 rounded-pill px-24 py-12 ${isNone ? 'bg-skeleton' : 'bg-blue'}`}
      style={{ flexBasis: BUTTON_BASIS }}
    >
      {isCounting && <ActivityIndicator size="small" color={colors['on-blue']} />}
      <Text variant="button-l" color={isNone ? 'muted' : 'on-blue'} className="text-center">
        {label}
      </Text>
    </Pressable>
  );
}

// The chip is 36 points high, as a filter chip: its hit slop brings the touch target to 44.
const hitSlop = (size['touch-min'] - size['chip-h']) / 2;

/** « × Plus de 12 h +12 »: a tap removes the group and counts again. */
function SuggestionChip({ suggestion, onPress }: { suggestion: Suggestion; onPress: () => void }) {
  const { t } = useTranslation();
  const separator = t('filters.listSeparator');
  const label = suggestion.filters.map(filterLabel).join(separator);
  const spoken = suggestion.filters.map((filter) => spokenFilterLabel(filter, t)).join(separator);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('filters.removeLabel', { filters: spoken, count: suggestion.gain })}
      hitSlop={hitSlop}
      onPress={onPress}
      className="min-h-chip-h flex-row items-center gap-6 self-start rounded-pill bg-surface px-12 py-6"
    >
      <Icon {...uiIcon('remove')} size="icon-s" />
      <Text variant="label" isDense className="shrink">
        {label}
      </Text>
      {/* Blue ink on warm grey: 6.72:1 (Ecrans › contrôle accessibilité E-03). */}
      <Text variant="label-strong" color="blue-ink" isDense>
        {t('filters.gain', { count: suggestion.gain })}
      </Text>
    </Pressable>
  );
}

/** Says a new status line to screen readers, without moving their focus. */
function useAnnounce(text: string | null) {
  useEffect(() => {
    if (text) {
      AccessibilityInfo.announceForAccessibility(text);
    }
  }, [text]);
}

/** « 9 parcours » once a count answers after a change, never the first one at the opening. */
function useAnnounceCount(count: FilterCount) {
  const { t } = useTranslation();
  const counted = count.status === 'counted' && count.count > 0 ? count.count : null;
  const isFirst = useRef(true);
  useEffect(() => {
    if (counted === null) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    AccessibilityInfo.announceForAccessibility(t('filters.counted', { count: counted }));
  }, [counted, t]);
}
