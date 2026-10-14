import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { spacing } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

/** The bar stuck at the foot reads the sheet through this store: it is drawn in a portal. */
export interface Footer {
  label: string;
  isDisabled: boolean;
  isOffline: boolean;
  onPress: () => void;
}

export interface FooterSlotProps extends BottomSheetFooterProps {
  store: StoreApi<Footer>;
  onHeight: (height: number) => void;
}

/**
 * The bar stuck at the foot of the planning sheet: « Programmer samedi 26 à 10:00 », capped at
 * 1.3 (`Button isDense`); offline, inactive with the sentence that explains it.
 */
export function FooterSlot({ store, onHeight, ...props }: FooterSlotProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { label, isDisabled, isOffline, onPress } = useStore(store);
  return (
    <BottomSheetFooter {...props}>
      <View
        className="gap-8 border-t border-line bg-bg px-16 pt-12"
        style={{ paddingBottom: Math.max(insets.bottom, spacing['space-12']) }}
        onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      >
        <Button label={label} isDense isFullWidth isDisabled={isDisabled} onPress={onPress} />
        {isOffline && (
          <Text variant="body-s" color="muted" className="text-center">
            {t('plan.offlineHint')}
          </Text>
        )}
      </View>
    </BottomSheetFooter>
  );
}
