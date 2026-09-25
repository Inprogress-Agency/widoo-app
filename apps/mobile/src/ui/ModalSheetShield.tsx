import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Whether a modal sheet, such as « Trier par », is open. Its portal lives at the root of the
 * app: it cannot hide on its own what it covers from screen readers, the screen and the tab bar.
 */
const modalSheet = createStore<{ isOpen: boolean }>(() => ({ isOpen: false }));

export function setModalSheetOpen(isOpen: boolean) {
  modalSheet.setState({ isOpen });
}

interface ModalSheetShieldProps {
  children: ReactNode;
  className?: string;
}

/** What a modal sheet covers: out of reach of VoiceOver and TalkBack while it is open. */
export function ModalSheetShield({ children, className }: ModalSheetShieldProps) {
  const isOpen = useStore(modalSheet, (state) => state.isOpen);
  return (
    <View
      className={className}
      accessibilityElementsHidden={isOpen}
      importantForAccessibility={isOpen ? 'no-hide-descendants' : 'auto'}
    >
      {children}
    </View>
  );
}
