import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors, motion, spacing, textStyles } from '@widoo/tokens';
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';
import { Text } from './Text';

type InputProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'keyboardType'
  | 'textContentType'
  | 'autoComplete'
  | 'autoCapitalize'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'maxLength'
>;

interface SheetTextFieldProps extends InputProps {
  /** « Adresse e-mail », above the field, and its name for the screen readers. */
  label: string;
  /** The line under the field: « Nous vous envoyons un lien de connexion. » */
  help?: string;
  /**
   * Takes the focus once the sheet has risen (`page`): a keyboard opened while it rises would
   * cover it, the sheet not yet following the keyboard.
   */
  isFocusedOnOpen?: boolean;
}

/**
 * A text field of a modal sheet (Ecrans › E-10): its label, a warm grey pill of 48 points at
 * least that grows with the text, and a line of help. The sheet follows the keyboard (M-05).
 */
export function SheetTextField({
  label,
  help,
  isFocusedOnOpen = false,
  ...input
}: SheetTextFieldProps) {
  const ref = useRef<ComponentRef<typeof BottomSheetTextInput>>(null);
  useEffect(() => {
    if (!isFocusedOnOpen) {
      return;
    }
    const timer = setTimeout(() => ref.current?.focus(), motion.durations.page);
    return () => clearTimeout(timer);
  }, [isFocusedOnOpen]);
  return (
    <View className="gap-8">
      <Text variant="label-strong" importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <View className="min-h-button-h justify-center rounded-pill bg-surface px-16">
        <BottomSheetTextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          accessibilityHint={help}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {help && (
        <Text
          variant="body-s"
          color="muted"
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          {help}
        </Text>
      )}
    </View>
  );
}

// The regular weight of the text at the size of the maquette (17), without a line height: iOS
// shifts the text of a single-line input that has one (as the search field).
const styles = StyleSheet.create({
  input: {
    fontFamily: textStyles.body.fontFamily,
    fontSize: textStyles['title-s'].fontSize,
    color: colors.ink,
    paddingVertical: spacing['space-10'],
  },
});
