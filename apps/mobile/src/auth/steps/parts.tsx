import type { UiIconKey } from '@widoo/tokens';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  View,
  type Text as NativeText,
} from 'react-native';
import { DiscButton } from '../../ui/DiscButton';
import { Icon, uiIcon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import type { SignInFailure } from '../provider';

/**
 * Title of a step, which takes the screen reader focus when the step appears (Ecrans › E-10,
 * lecteur d'écran: focus on the title).
 */
export function StepTitle({ children }: { children: string }) {
  const ref = useRef<NativeText>(null);
  useEffect(() => {
    const node = ref.current && findNodeHandle(ref.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, []);
  return (
    <Text ref={ref} variant="title-l" accessibilityRole="header" className="flex-1 text-center">
      {children}
    </Text>
  );
}

/** A step entered from another: the arrow back, and the title centred. */
export function StepHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <View className="flex-row items-center gap-8">
      <DiscButton icon="back" surface="surface" accessibilityLabel={backLabel} onPress={onBack} />
      <StepTitle>{title}</StepTitle>
      {/* As wide as the arrow: the title stays centred. */}
      <View className="size-disc" />
    </View>
  );
}

/**
 * The icon of a step in its disc of 56 points, decorative: e-mail sent, link expired. tokens.json
 * has no size for this disc, the marker's stands in (as in StatusMessage).
 */
export function StepIcon({ icon, tone }: { icon: UiIconKey; tone: 'blue' | 'surface' }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={`size-marker items-center justify-center self-center rounded-pill ${tone === 'blue' ? 'bg-blue-soft' : 'bg-surface'}`}
    >
      <Icon {...uiIcon(icon)} size="icon-l" color={tone === 'blue' ? 'blue-ink' : 'ink'} />
    </View>
  );
}

const failureIcons = { offline: 'offline', failed: 'error', expired: 'error' } as const;

/**
 * The discreet line of a failed sign-in, above the buttons, which stay active: barred cloud, or
 * barred wifi offline. Told as a status by the screen readers.
 */
export function ErrorLine({ failure }: { failure: SignInFailure }) {
  const { t } = useTranslation();
  const label = failure === 'offline' ? t('auth.error.offline') : t('auth.error.failed');
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(label);
    }
  }, [label]);
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      className="flex-row items-center justify-center gap-8"
    >
      <Icon {...uiIcon(failureIcons[failure])} size="icon-s" color="muted" />
      <Text variant="body-s" color="muted" className="shrink text-center">
        {label}
      </Text>
    </View>
  );
}

/** The content of a step: its blocks spaced as in the maquette. */
export function StepBody({ children }: { children: ReactNode }) {
  return <View className="gap-16">{children}</View>;
}
