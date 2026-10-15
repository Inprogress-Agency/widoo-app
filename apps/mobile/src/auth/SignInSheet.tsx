import {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { motion, size } from '@widoo/tokens';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Keyboard, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { ModalSheetBackdrop, ModalSheetBackground, ModalSheetHandle } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { OverModals } from '../ui/OverModals';
import type { SignInFlow, SignInFlowState } from './flow';
import { openMailApp } from './links';
import { ChoicesStep } from './steps/ChoicesStep';
import { EmailStep } from './steps/EmailStep';
import { ExpiredStep } from './steps/ExpiredStep';
import { SentStep } from './steps/SentStep';
import { WelcomeStep } from './steps/WelcomeStep';

/** Each step fades in over the last (M-08); a fade, kept with « Réduire les animations ». */
const stepEntering = FadeIn.duration(motion.durations.fade).reduceMotion(ReduceMotion.Never);

/** A required name step closes neither by a swipe, nor on the veil, nor by back. */
const isLocked = (state: SignInFlowState) =>
  state.step === 'welcome' && state.welcome?.isRequired === true;

/**
 * The sheet E-10, over the screen in use, veiled (M-05): no cross, centred texts; it closes by a
 * swipe down, on the veil, by the escape gesture of iOS or back on Android, and nothing is saved.
 * It grows with its content up to the top of the screen, then scrolls; a step with a field sits
 * on the keyboard, which it follows.
 */
export function SignInSheet({ flow }: { flow: SignInFlow }) {
  const { t } = useTranslation();
  const state = useStore(flow.store);
  const sheet = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  const closeConfig = useBottomSheetTimingConfigs(timing('base', 'move', 'exit'));
  const locked = isLocked(state);
  const isKeyboardShown = useIsKeyboardShown();
  const closeLabel = t('auth.close');
  // Stable parts, which read the lock themselves: a veil mounted anew is drawn over the sheet.
  const parts = useMemo(() => lockAwareParts(flow, closeLabel), [flow, closeLabel]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (!state.isOpen) {
      // Never before a first opening: the sheet would no longer present afterwards (gorhom).
      if (wasOpen.current) {
        sheet.current?.dismiss(closeConfig);
      }
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    setModalSheetOpen(true);
    sheet.current?.present();
  }, [state.isOpen, closeConfig]);

  useEffect(() => {
    if (!state.isOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!locked) {
        flow.dismiss();
      }
      return true;
    });
    return () => subscription.remove();
  }, [state.isOpen, locked, flow]);

  // A screen left with the sheet open gives the screen readers back.
  useEffect(() => () => setModalSheetOpen(false), []);

  return (
    <BottomSheetModal
      ref={sheet}
      containerComponent={OverModals}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      enablePanDownToClose={!locked}
      maxDynamicContentSize={height - insets.top}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={parts.backdrop}
      backgroundComponent={ModalSheetBackground}
      handleComponent={parts.handle}
      onDismiss={() => {
        setModalSheetOpen(false);
        // Already dismissed: the closed state must not dismiss it again, which would keep it
        // from presenting at the next opening (gorhom).
        wasOpen.current = false;
        // Closed by the user: by a swipe or on the veil.
        if (flow.store.getState().isOpen) {
          flow.dismiss();
        }
      }}
      accessible={false}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          // On the keyboard, the sheet sits right on it: no home indicator to clear.
          paddingBottom: (isKeyboardShown ? 0 : insets.bottom) + size['touch-min'] / 2,
        }}
      >
        <View
          accessibilityViewIsModal
          accessibilityLabel={t('auth.dialog')}
          onAccessibilityEscape={locked ? undefined : flow.dismiss}
          className="px-16 pt-8"
        >
          <Animated.View key={state.step} entering={stepEntering}>
            <Step flow={flow} state={state} />
          </Animated.View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/**
 * The veil and the handle of the sheet, which a required name step locks: the veil no longer
 * closes it, the handle gives way to a margin (Ecrans › E-10, sans poignée).
 */
function lockAwareParts(flow: SignInFlow, closeLabel: string) {
  return {
    backdrop: function SignInBackdrop(props: BottomSheetBackdropProps) {
      const isLockedNow = useStore(flow.store, isLocked);
      return (
        <ModalSheetBackdrop
          {...props}
          closeLabel={closeLabel}
          pressBehavior={isLockedNow ? 'none' : 'close'}
        />
      );
    },
    handle: function SignInHandle() {
      const isLockedNow = useStore(flow.store, isLocked);
      // Without its bar, the handle keeps its room: the title stays where it was.
      return isLockedNow ? (
        <View className="pb-8 pt-12">
          <View className="h-4" />
        </View>
      ) : (
        <ModalSheetHandle />
      );
    },
  };
}

/** Whether the keyboard is up, as the system tells it. */
function useIsKeyboardShown() {
  const [isShown, setIsShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setIsShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setIsShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return isShown;
}

function Step({ flow, state }: { flow: SignInFlow; state: SignInFlowState }) {
  const { step, error, isBusy, email } = state;
  switch (step) {
    case 'choices':
      return (
        <ChoicesStep
          intent={state.intent ?? 'favorite'}
          error={error}
          isBusy={isBusy}
          onGoogle={() => void flow.signInWithGoogle()}
          onEmail={flow.chooseEmail}
        />
      );
    case 'email':
      return (
        <EmailStep
          initialEmail={email}
          isConfirm={state.pendingLink !== null}
          error={error}
          isBusy={isBusy}
          onBack={flow.back}
          onSubmit={(address) => void flow.submitEmail(address)}
        />
      );
    case 'sent':
      return (
        <SentStep
          email={email}
          sentAt={state.sentAt ?? 0}
          error={error}
          isBusy={isBusy}
          onBack={flow.back}
          onOpenMail={() => void openMailApp()}
          onResend={() => void flow.resend()}
          onChangeAddress={flow.changeAddress}
        />
      );
    case 'welcome':
      return (
        <WelcomeStep
          initialFirstName={state.welcome?.firstName ?? ''}
          isPrefilled={state.welcome?.isPrefilled ?? false}
          error={error}
          isBusy={isBusy}
          onSubmit={(firstName) => void flow.saveFirstName(firstName)}
        />
      );
    case 'expired':
      return (
        <ExpiredStep
          email={email}
          isBusy={isBusy}
          onResend={() => void flow.resend()}
          onChangeAddress={flow.changeAddress}
        />
      );
  }
}
