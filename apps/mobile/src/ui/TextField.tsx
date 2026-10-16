import { colors, spacing, textStyles } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

type InputProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
  | 'keyboardType'
>;

interface TextFieldProps extends InputProps {
  /** « Bio », above the field, and its name for the screen readers. */
  label: string;
  /** The line under the field: « Visible sur votre profil public. », « Facultatif. ». */
  help?: string;
  /** With a counter « 103/150 », read « 103 caractères sur 150 ». */
  maxLength?: number;
  isMultiline?: boolean;
  /** Under the field, in `error-ink` with its icon: the field the API would refuse. */
  error?: string;
  /** What a screen reader calls the field when it differs from the label (« …, facultatif »). */
  spokenLabel?: string;
  /** The counter as the screen writes it, « 100 / 280 »; « 103/150 » by default. */
  formatCounter?: (length: number, max: number) => string;
}

/**
 * A text field of a page (Modifier le profil): its label, a warm grey field that grows with the
 * text (a pill on one line, a block on several), its help and counter, and the error under it.
 */
export function TextField({
  label,
  help,
  maxLength,
  isMultiline = false,
  error,
  spokenLabel,
  formatCounter = (length, max) => `${length}/${max}`,
  ...input
}: TextFieldProps) {
  const { t } = useTranslation();
  const length = input.value?.length ?? 0;
  const counter = maxLength === undefined ? null : formatCounter(length, maxLength);
  const spokenCounter =
    maxLength === undefined ? null : t('field.counter', { count: length, max: maxLength });
  const hint = [error, help, spokenCounter].filter(Boolean).join('. ');
  return (
    <View className="gap-8">
      <Text variant="label-strong" importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <View
        className={`min-h-button-h justify-center bg-surface px-16 ${isMultiline ? 'rounded-section py-8' : 'rounded-pill'} ${error ? 'border-2 border-error-ink' : ''}`}
      >
        <TextInput
          {...input}
          accessibilityLabel={spokenLabel ?? label}
          accessibilityHint={hint || undefined}
          maxLength={maxLength}
          multiline={isMultiline}
          placeholderTextColor={colors.muted}
          style={[styles.input, isMultiline && styles.multiline]}
        />
      </View>
      {error && (
        <View
          className="flex-row items-center gap-6"
          importantForAccessibility="no-hide-descendants"
        >
          <Icon name="warning-circle" weight="fill" size="icon-s" color="error-ink" />
          <Text variant="body-s" color="error-ink" className="flex-1">
            {error}
          </Text>
        </View>
      )}
      {(help || counter) && (
        <View
          className="flex-row flex-wrap justify-between gap-x-12"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {help && (
            <Text variant="body-s" color="muted" className="shrink">
              {help}
            </Text>
          )}
          {counter && (
            <Text variant="body-s" color="muted">
              {counter}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// The regular text of the maquette (17), without a line height: iOS shifts the text of a
// single-line input that has one (as the search field), Android clips it at 150 % (D-043).
const styles = StyleSheet.create({
  input: {
    fontFamily: textStyles.body.fontFamily,
    fontSize: textStyles['title-s'].fontSize,
    color: colors.ink,
    paddingVertical: spacing['space-10'],
  },
  multiline: { textAlignVertical: 'top' },
});
