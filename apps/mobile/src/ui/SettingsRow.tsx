import { colors, type UiIconKey } from '@widoo/tokens';
import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Icon, uiIcon } from './Icon';
import { Text } from './Text';

/** A section of the settings: « Compte », « Préférences »; its title read as a header. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4">
      <Text variant="status" color="muted" accessibilityRole="header" className="pt-16">
        {title}
      </Text>
      {children}
    </View>
  );
}

interface SettingsRowProps {
  icon: UiIconKey;
  label: string;
  /** On the right, or under the label when it does not fit: « Français », the e-mail. */
  value?: string;
  /** Under the label: « Annuel, renouvelé le 12 octobre 2026 ». */
  help?: string;
  /** Without it, the row is read as text: it leads nowhere yet. */
  onPress?: () => void;
  /** `link` opens a page or the browser, `button` acts in place (« Se déconnecter »). */
  role?: 'link' | 'button';
  /** An external page (the store, the site): the arrow out instead of the chevron. */
  isExternal?: boolean;
  /** Something on the right of a row with a help: « Gérer ». */
  trailingLabel?: string;
}

/**
 * A row of the settings (Ecrans › E-09, Réglages): icon, label and value in a row that wraps, so
 * that the value passes under the label when the room runs out, an e-mail address never cut
 * (D-028); a hairline under it, the whole row a touch target.
 */
export function SettingsRow({
  icon,
  label,
  value,
  help,
  onPress,
  role = 'link',
  isExternal = false,
  trailingLabel,
}: SettingsRowProps) {
  const spoken = [label, help, value, trailingLabel].filter(Boolean).join(', ');
  const content = (
    <>
      <Icon {...uiIcon(icon)} size="icon-l" />
      <View className="flex-1 flex-row flex-wrap items-center justify-between gap-x-12 gap-y-4">
        <View className="shrink gap-4">
          <Text variant="body">{label}</Text>
          {help && (
            <Text variant="body-s" color="muted">
              {help}
            </Text>
          )}
        </View>
        {value && (
          <Text variant="body" color="muted">
            {value}
          </Text>
        )}
      </View>
      {trailingLabel && (
        <Text variant="button" color="blue">
          {trailingLabel}
        </Text>
      )}
      {onPress && role === 'link' && (
        <Icon
          {...uiIcon(isExternal ? 'external' : 'open-row')}
          size="icon-m"
          color={isExternal ? 'blue' : 'muted'}
        />
      )}
    </>
  );
  const className = 'min-h-touch-min flex-row items-center gap-16 border-b border-line py-16';
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken} className={className}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={spoken}
      onPress={onPress}
      className={className}
    >
      {content}
    </Pressable>
  );
}

/** An inactive switch, which keeps its state (tokens.json › mappings.settings.notifications). */
const DISABLED_OPACITY = 0.4;

interface SwitchRowProps {
  icon: UiIconKey;
  label: string;
  help?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDisabled?: boolean;
}

/**
 * A switch of the settings (« Profil public »): the whole row is the switch for touch and
 * screen readers (« Profil public, interrupteur, activé »). Track `blue` on (4.51:1),
 * `control-border` off (3.49:1), white thumb (Direction-Artistique › Contrastes). Inactive, it
 * keeps its state: icon and label in `muted`, the switch at 40 % (Ecrans › E-19, D-061).
 */
export function SwitchRow({
  icon,
  label,
  help,
  value,
  onValueChange,
  isDisabled = false,
}: SwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={help}
      accessibilityState={{ checked: value, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => onValueChange(!value)}
      className="min-h-touch-min flex-row items-center gap-16 border-b border-line py-16"
    >
      <Icon {...uiIcon(icon)} {...(isDisabled && { color: 'muted' as const })} size="icon-l" />
      <View className="flex-1 gap-4">
        <Text variant="body" color={isDisabled ? 'muted' : 'ink'}>
          {label}
        </Text>
        {help && (
          <Text variant="body-s" color="muted">
            {help}
          </Text>
        )}
      </View>
      {/* The row carries the role and the state: the native switch is not read twice. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={isDisabled ? { opacity: DISABLED_OPACITY } : undefined}
      >
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={isDisabled}
          trackColor={{ true: colors.blue, false: colors['control-border'] }}
          thumbColor={colors.bg}
          ios_backgroundColor={colors['control-border']}
        />
      </View>
    </Pressable>
  );
}
