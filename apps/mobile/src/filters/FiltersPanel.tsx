import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupFilters, isActive, panelGroups } from '../discovery/filters';
import { activeFilterCount, type SearchFilters } from '../discovery/store';
import { useFilterCount } from '../discovery/useFilterCount';
import { discoveryStore, useDiscovery } from '../discovery/useRouteSearch';
import { Chip } from '../ui/Chip';
import { Icon, uiIcon } from '../ui/Icon';
import { ModalSheetBackground, ModalSheetHandle, modalSheetBackdrop } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { ScrollEdgeFade, scrollEdgeHeight } from '../ui/ScrollEdgeFade';
import { Text } from '../ui/Text';
import { filterIcon, filterLabel, filterTint, spokenFilterLabel } from './filterChip';
import { PanelFooter } from './PanelFooter';

/** Top of the sheet from the top of the screen (Ecrans › E-03: « haut à 60 px »). */
const PANEL_TOP = 60;

const fullHeight = ['100%'];

// M-05: rises in `page`, closes in `base` `exit`. Fixed here: the configs stay the same from one
// render to the next, and the sheet is presented once per opening.
const openTiming = timing('page', 'move');
const closeTiming = timing('base', 'move', 'exit');

/**
 * The filters panel (Ecrans › E-03): a modal sheet almost full screen over an ink veil (M-05),
 * open while the discovery store holds a draft. Its chips change the draft only; « Voir N
 * parcours » applies it, and a close by the button, a swipe or the veil drops it.
 */
export function FiltersPanel() {
  const draft = useDiscovery((state) => state.draft);
  // The last draft stays drawn while the sheet goes down, after it is applied or dropped.
  const [shown, setShown] = useState(draft);
  if (draft && draft !== shown) {
    setShown(draft);
  }
  const [footerHeight, setFooterHeight] = useState(0);
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => <PanelFooterSlot {...props} onHeight={setFooterHeight} />,
    [],
  );
  const sheet = useRef<BottomSheetModal>(null);
  const wasOpen = useRef(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const openConfig = useBottomSheetTimingConfigs(openTiming);
  const closeConfig = useBottomSheetTimingConfigs(closeTiming);
  const isOpen = draft !== null;

  useEffect(() => {
    if (isOpen) {
      setModalSheetOpen(true);
      sheet.current?.present();
    } else if (wasOpen.current) {
      // Never before a first opening: the sheet would no longer present afterwards.
      sheet.current?.dismiss(closeConfig);
    }
    wasOpen.current = isOpen;
  }, [isOpen, closeConfig]);
  // A screen left with the panel open gives the screen readers back.
  useEffect(() => () => setModalSheetOpen(false), []);

  return (
    <BottomSheetModal
      ref={sheet}
      snapPoints={fullHeight}
      enableDynamicSizing={false}
      topInset={Math.max(PANEL_TOP, insets.top)}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      backdropComponent={modalSheetBackdrop(t('filters.close'))}
      backgroundComponent={ModalSheetBackground}
      handleComponent={ModalSheetHandle}
      footerComponent={renderFooter}
      onDismiss={() => {
        setModalSheetOpen(false);
        // A swipe down or the veil: nothing applied, the filters stay as they were.
        discoveryStore.getState().closeFilters();
      }}
      accessible={false}
    >
      {shown && <PanelContent draft={shown} bottom={footerHeight} />}
    </BottomSheetModal>
  );
}

interface PanelFooterSlotProps extends BottomSheetFooterProps {
  /** Height of the bar stuck at the foot, so that the last group scrolls above it and its fade. */
  onHeight: (height: number) => void;
}

function PanelFooterSlot({ onHeight, ...props }: PanelFooterSlotProps) {
  const insets = useSafeAreaInsets();
  const draft = useDiscovery((state) => state.draft);
  // Counted on the last draft while the sheet goes down: no count of an empty draft on the way.
  const [shown, setShown] = useState(draft ?? {});
  if (draft && draft !== shown) {
    setShown(draft);
  }
  const count = useFilterCount(shown);
  const { resetDraft, removeDraftGroup, applyFilters } = discoveryStore.getState();
  return (
    <BottomSheetFooter {...props}>
      <View
        style={{ paddingBottom: insets.bottom }}
        className="bg-bg"
        onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      >
        <PanelFooter
          count={count}
          onApply={applyFilters}
          onReset={resetDraft}
          onRemoveGroup={(suggestion) => removeDraftGroup(suggestion.group)}
        />
      </View>
    </BottomSheetFooter>
  );
}

/** Header, then the six groups; the dialog is named « Filtres, N actifs » and takes the focus. */
function PanelContent({ draft, bottom }: { draft: SearchFilters; bottom: number }) {
  const { t } = useTranslation();
  const title = useRef<View>(null);
  const active = activeFilterCount(draft);
  const activeText = active > 0 ? t('filters.active', { count: active }) : null;
  useEffect(() => {
    if (title.current) {
      AccessibilityInfo.sendAccessibilityEvent(title.current, 'focus');
    }
  }, []);
  return (
    <View
      className="flex-1"
      role="dialog"
      aria-modal
      aria-label={activeText ? `${t('filters.title')}, ${activeText}` : t('filters.title')}
      // Not `accessibilityViewIsModal`: it would hide the bar stuck at the foot, a sibling drawn
      // by the sheet. What the panel covers is hidden by ModalSheetShield.
    >
      <View className="flex-row items-center gap-12 border-b border-line px-16 pb-12">
        <View
          ref={title}
          accessible
          accessibilityRole="header"
          className="flex-1 flex-row flex-wrap items-baseline gap-x-8"
        >
          <Text variant="title-l">{t('filters.title')}</Text>
          {activeText && (
            <Text variant="body-medium" color="muted">
              {activeText}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('filters.close')}
          onPress={() => discoveryStore.getState().closeFilters()}
          className="size-disc items-center justify-center rounded-pill bg-surface"
        >
          <Icon {...uiIcon('close')} />
        </Pressable>
      </View>
      {/* The last group ends above the bar and its fade. */}
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: bottom + scrollEdgeHeight }}>
        <View className="gap-24 px-16 py-20">
          {panelGroups.map((group) => (
            <FilterGroup key={group} group={group} draft={draft} />
          ))}
        </View>
      </BottomSheetScrollView>
      <ScrollEdgeFade bottom={bottom} />
    </View>
  );
}

function FilterGroup({
  group,
  draft,
}: {
  group: (typeof panelGroups)[number];
  draft: SearchFilters;
}) {
  const { t } = useTranslation();
  const toggle = useDiscovery((state) => state.toggleDraft);
  return (
    <View className="gap-12">
      <Text variant="title-s" accessibilityRole="header">
        {t(`filters.groups.${group}`)}
      </Text>
      <View className="flex-row flex-wrap gap-8">
        {groupFilters(group).map((filter) => (
          <Chip
            key={filter.value}
            label={filterLabel(filter)}
            accessibilityLabel={spokenFilterLabel(filter, t)}
            icon={filterIcon(filter)}
            tint={filterTint(filter)}
            surface="surface"
            isActive={isActive(draft, filter)}
            onPress={() => toggle(filter)}
          />
        ))}
      </View>
    </View>
  );
}
