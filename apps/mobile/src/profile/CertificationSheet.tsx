import {
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import type { Certification, CertificationCriterion } from '@widoo/shared';
import { size } from '@widoo/tokens';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRating } from '../format/rating';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { ModalSheetBackground, ModalSheetHandle, modalSheetBackdrop } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { Text } from '../ui/Text';
import { OverModals } from '../ui/OverModals';

export interface CertificationSheetMethods {
  open: () => void;
}

interface CertificationSheetProps {
  ref?: Ref<CertificationSheetMethods>;
  certification: Certification;
  /**
   * The creator whose public profile it is (E-16): the sheet tells a visitor why the badge is
   * there, and closes on « Compris ».
   */
  creatorName?: string;
}

/**
 * « Créateur certifié » from my profile (Ecrans › E-09, E-16): a modal sheet (M-05) with the three
 * criteria, an empty circle or a green check and my value, then how the badge comes. Taller than
 * the screen at large text: it scrolls under the status bar, the button kept at the bottom
 * (D-028). « Créer un parcours » leads to the editor, not built yet: read dimmed until then.
 */
export function CertificationSheet({ ref, certification, creatorName }: CertificationSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = useRef<BottomSheetModal>(null);
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  useImperativeHandle(ref, () => ({
    open: () => {
      setModalSheetOpen(true);
      sheet.current?.present();
    },
  }));
  useEffect(() => () => setModalSheetOpen(false), []);
  const isVisitor = creatorName !== undefined;
  const title =
    certification.isCertified || isVisitor
      ? t('profile.certification.titleCertified')
      : t('profile.certification.titleNotYet');

  return (
    <BottomSheetModal
      ref={sheet}
      // Over the native modals too: E-16 opens over the route sheet (Ecrans › E-16).
      containerComponent={OverModals}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      backdropComponent={modalSheetBackdrop(t('profile.certification.close'))}
      backgroundComponent={ModalSheetBackground}
      handleComponent={ModalSheetHandle}
      // Up to the status bar at most (D-028), then the content scrolls.
      maxDynamicContentSize={height - insets.top}
      onDismiss={() => setModalSheetOpen(false)}
      accessible={false}
    >
      <BottomSheetScrollView
        accessibilityViewIsModal
        contentContainerClassName="gap-16 px-16 pt-8"
        contentContainerStyle={{ paddingBottom: insets.bottom + size['touch-min'] / 2 }}
      >
        <View className="items-center gap-12">
          <View className="size-marker items-center justify-center rounded-pill bg-blue-soft">
            <Icon {...uiIcon('certified')} size="icon-l" />
          </View>
          <Text variant="title-l" accessibilityRole="header" className="text-center">
            {title}
          </Text>
          <Text variant="body" color="muted" className="text-center">
            {isVisitor
              ? t('creator.certification.body', { name: creatorName })
              : t('profile.certification.body')}
          </Text>
        </View>
        <View>
          {certification.criteria.map((criterion) => (
            <CriterionRow key={criterion.criterion} criterion={criterion} isVisitor={isVisitor} />
          ))}
        </View>
        <Text variant="body-s" color="muted" className="text-center">
          {isVisitor ? t('creator.certification.footer') : t('profile.certification.footer')}
        </Text>
        {isVisitor ? (
          <Button
            isFullWidth
            variant="secondary"
            label={t('creator.certification.understood')}
            onPress={() => sheet.current?.dismiss()}
          />
        ) : (
          <Button
            isFullWidth
            isDisabled
            label={t('profile.certification.create')}
            onPress={() => undefined}
          />
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/** One criterion, one element: « 3 parcours vérifiés ou plus, 2 sur 3, pas encore rempli ». */
function CriterionRow({
  criterion,
  isVisitor,
}: {
  criterion: CertificationCriterion;
  isVisitor: boolean;
}) {
  const { t } = useTranslation();
  const key = criterion.criterion;
  const isRating = key === 'averageRating';
  const threshold = isRating ? formatRating(criterion.threshold) : String(criterion.threshold);
  const label = t(`profile.certification.${key}.title`, { threshold });
  let value: string;
  if (criterion.value === null) {
    value = isRating ? t('profile.certification.noRating') : '0';
  } else if (isRating) {
    value = formatRating(criterion.value);
  } else {
    value = criterion.isMet
      ? String(criterion.value)
      : t('profile.certification.progress', { value: criterion.value, threshold });
  }
  const state = criterion.isMet ? t('profile.certification.met') : t('profile.certification.unmet');
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value}, ${state}`}
      className="flex-row items-center gap-12 border-b border-line py-16"
    >
      <Icon
        {...uiIcon(criterion.isMet ? 'done' : 'todo')}
        size="icon-l"
        color={criterion.isMet ? 'green-ink' : 'control-border'}
      />
      <View className="flex-1 gap-4">
        <Text variant="body-medium">{label}</Text>
        <Text variant="body-s" color="muted">
          {isVisitor && key === 'averageRating'
            ? t('creator.certification.averageRatingHelp')
            : t(`profile.certification.${key}.help`)}
        </Text>
      </View>
      {/* « Pas encore de note » is a phrase, not a figure. */}
      <Text
        variant={criterion.value === null && isRating ? 'body-s' : 'number-m'}
        color={criterion.isMet ? 'ink' : 'muted'}
        className="shrink text-right"
      >
        {value}
      </Text>
    </View>
  );
}
