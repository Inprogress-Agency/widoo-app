import {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import type { PlannedRoute, RouteDetail, RouteDetailStep } from '@widoo/shared';
import { motion, spacing } from '@widoo/tokens';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import { ModalSheetBackground, ModalSheetHandle, modalSheetBackdrop } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { OverModals } from '../ui/OverModals';
import { StatusLine } from '../ui/StatusLine';
import { Text } from '../ui/Text';
import { uiIcon } from '../ui/Icon';
import { earliestMinuteOf, planDayOf, planMinuteOf, planStartOf, roundToStep } from './calendar';
import { CalendarStep } from './CalendarStep';
import { Checklist } from './Checklist';
import { planNotice, type PlanNotice as Notice } from './notice';
import { DayChips, TimeStepper } from './PlanControls';
import { FooterSlot, type Footer } from './PlanFooter';
import { PlanNotice } from './PlanNotice';
import { fullDayName, submitLabel } from './planText';
import { Programme, ProgrammeUnavailable } from './Programme';
import { usePlanTimeline } from './usePlanTimeline';

/** What « Programmer » sends: the day, the time, the bookings ticked, and what was shown. */
export interface PlanChoice {
  route: RouteDetail;
  planned: PlannedRoute | null;
  day: string;
  minute: number;
  checked: ReadonlySet<string>;
  notice: Notice | null;
}

export interface PlanSheetMethods {
  /** A route to plan, or a planning to move (« Modifier la sortie »). */
  open: (route: RouteDetail, planned: PlannedRoute | null) => void;
}

interface PlanSheetProps {
  ref?: Ref<PlanSheetMethods>;
  isOnline: boolean;
  /** `share_token` of a private route opened by its link, for its timeline. */
  token?: string;
  /** Plans or moves; true when done, which closes the sheet. */
  onSubmit: (choice: PlanChoice) => Promise<boolean>;
  onToggleBooking: (route: RouteDetail, step: RouteDetailStep, isChecked: boolean) => void;
  onBook: (route: RouteDetail, step: RouteDetailStep) => void;
  now?: () => Date;
}

interface Draft {
  route: RouteDetail;
  planned: PlannedRoute | null;
  step: 'days' | 'calendar';
  day: string;
  minute: number;
  calendarDay: string;
  checked: Set<string>;
}

const stepEntering = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);
const unlockedSteps = (route: RouteDetail) =>
  route.steps.filter((step): step is RouteDetailStep => !step.isLocked);

/** Today at the suggested start when it is still to come, else tomorrow (E-06, choix d'Ilan). */
function initialDraft(route: RouteDetail, planned: PlannedRoute | null, now: Date): Draft {
  const today = planDayOf(now);
  const startsAt = planned?.startsAt ?? route.timeline.startsAt;
  const minute = roundToStep(planMinuteOf(startsAt));
  const tomorrow = planDayOf(new Date(now.getTime() + 86_400_000));
  const day = planned
    ? planDayOf(planned.startsAt)
    : minute >= earliestMinuteOf(today, now)
      ? today
      : tomorrow;
  const checked = new Set(
    planned?.checklist.filter((item) => item.isChecked).map((item) => item.stepId),
  );
  return { route, planned, step: 'days', day, minute, calendarDay: day, checked };
}

/**
 * The sheet « Programmer la sortie » over the route sheet (Ecrans › E-06, M-05): no cross, closed
 * by a swipe or on the veil; up to the status bar, then it scrolls, the button stuck at its foot.
 * « Autre date » is its next step, faded in. Offline, the day, the time and the bookings stay
 * readable, the button inactive with the sentence that explains it.
 */
export function PlanSheet({
  ref,
  isOnline,
  token,
  onSubmit,
  onToggleBooking,
  onBook,
  now = () => new Date(),
}: PlanSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = useRef<BottomSheetModal>(null);
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  const closeConfig = useBottomSheetTimingConfigs(timing('base', 'move', 'exit'));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const [footer] = useState(() =>
    createStore<Footer>(() => ({
      label: '',
      isDisabled: true,
      isOffline: false,
      onPress: () => undefined,
    })),
  );

  useImperativeHandle(ref, () => ({
    open: (route, planned) => {
      setDraft(initialDraft(route, planned, now()));
      setModalSheetOpen(true);
      sheet.current?.present();
    },
  }));
  useEffect(() => () => setModalSheetOpen(false), []);

  const today = planDayOf(now());
  const startsAt = draft ? planStartOf(draft.day, draft.minute) : '';
  const { timeline, isError, retry } = usePlanTimeline(
    draft?.route.id ?? '',
    startsAt,
    draft !== null && isOnline,
    token,
  );
  const steps = draft ? unlockedSteps(draft.route) : [];
  const notice =
    draft && timeline && isOnline
      ? planNotice(steps, timeline, draft.day, draft.minute, now())
      : null;
  const update = (patch: Partial<Draft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const setDay = (day: string) =>
    setDraft((current) =>
      current
        ? { ...current, day, minute: Math.max(current.minute, earliestMinuteOf(day, now())) }
        : current,
    );

  const submit = async () => {
    if (!draft || isBusy) {
      return;
    }
    setIsBusy(true);
    const isDone = await onSubmit({ ...draft, notice });
    setIsBusy(false);
    if (isDone) {
      sheet.current?.dismiss(closeConfig);
    }
  };

  // The bar of the sheet: the day and the time, the day of the calendar, or offline.
  useEffect(() => {
    if (!draft) {
      return;
    }
    footer.setState(
      draft.step === 'calendar'
        ? {
            label: t('plan.chooseDay', { day: fullDayName(draft.calendarDay, today) }),
            isDisabled: false,
            isOffline: false,
            onPress: () => {
              setDay(draft.calendarDay);
              update({ step: 'days' });
            },
          }
        : {
            label: isOnline
              ? submitLabel(t, draft.planned !== null, draft.day, draft.minute, today)
              : t('plan.submitOffline'),
            isDisabled: !isOnline || isBusy,
            isOffline: !isOnline,
            onPress: () => void submit(),
          },
    );
  });

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <FooterSlot {...props} store={footer} onHeight={setFooterHeight} />
    ),
    [footer],
  );

  const title = draft?.planned ? t('plan.editTitle') : t('plan.title');
  return (
    <BottomSheetModal
      ref={sheet}
      containerComponent={OverModals}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      maxDynamicContentSize={height - insets.top}
      backdropComponent={modalSheetBackdrop(t('plan.close'))}
      backgroundComponent={ModalSheetBackground}
      handleComponent={ModalSheetHandle}
      footerComponent={renderFooter}
      onDismiss={() => {
        setModalSheetOpen(false);
        setDraft(null);
      }}
      accessible={false}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: footerHeight + spacing['space-16'] }}
      >
        {draft && (
          <View
            accessibilityViewIsModal
            accessibilityLabel={t(draft.planned ? 'plan.editDialog' : 'plan.dialog', {
              title: draft.route.title,
            })}
            className="px-16 pt-8"
          >
            <Animated.View key={draft.step} entering={stepEntering} className="gap-24">
              {draft.step === 'calendar' ? (
                <CalendarStep
                  selected={draft.calendarDay}
                  today={today}
                  onSelect={(calendarDay) => update({ calendarDay })}
                  onBack={() => update({ step: 'days' })}
                />
              ) : (
                <>
                  <View className="gap-4">
                    <Text variant="title-l" accessibilityRole="header">
                      {title}
                    </Text>
                    <Text variant="body-medium" color="muted">
                      {draft.route.title}
                    </Text>
                  </View>
                  {!isOnline && (
                    <StatusLine icon={uiIcon('offline').name} text={t('plan.offline')} />
                  )}
                  <DayChips
                    day={draft.day}
                    today={today}
                    onChange={setDay}
                    onOtherDate={() => update({ step: 'calendar', calendarDay: draft.day })}
                  />
                  <View className="gap-16">
                    <TimeStepper
                      minute={draft.minute}
                      minMinute={earliestMinuteOf(draft.day, now())}
                      onChange={(minute) => update({ minute })}
                    />
                    {notice && (
                      <PlanNotice
                        notice={notice}
                        today={today}
                        onMinute={(minute) => update({ minute })}
                        onDay={setDay}
                      />
                    )}
                  </View>
                  <Checklist
                    bookings={steps.filter((step) => step.bookingRequired)}
                    checked={draft.checked}
                    onToggle={(step) => {
                      const checked = new Set(draft.checked);
                      const isChecked = !checked.has(step.id);
                      if (isChecked) {
                        checked.add(step.id);
                      } else {
                        checked.delete(step.id);
                      }
                      update({ checked });
                      onToggleBooking(draft.route, step, isChecked);
                    }}
                    onBook={(step) => onBook(draft.route, step)}
                  />
                  {isOnline &&
                    (timeline ? (
                      <Programme steps={steps} timeline={timeline} day={draft.day} />
                    ) : (
                      isError && <ProgrammeUnavailable onRetry={retry} />
                    ))}
                </>
              )}
            </Animated.View>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
