import type { AppLocale } from '@widoo/shared';
import { colors, spacing } from '@widoo/tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountLocaleOf, type LanguageChoice } from '../i18n/choice';
import { languageStore, useLanguageChoice } from '../i18n/language';
import { Icon, uiIcon } from '../ui/Icon';
import { Radio } from '../ui/Radio';
import FlagFr from '../ui/svg/generated/FlagFr';
import FlagGb from '../ui/svg/generated/FlagGb';
import { Text } from '../ui/Text';
import { showToast } from '../ui/toastStore';
import { TopBar } from '../ui/TopBar';
import { useMe, useUpdateMe } from './me';

/** Size of the flags and of the phone disc (tokens.json › mappings.settings.language). */
const MARK_SIZE = 28;
/** Least height of a row (`mappings.settings.language.rowHeight`, not in the generated theme). */
const ROW_MIN_HEIGHT = 56;

const flags: Record<AppLocale, ReactNode> = {
  fr: <FlagFr size={MARK_SIZE} color={colors.ink} />,
  en: <FlagGb size={MARK_SIZE} color={colors.ink} />,
};

/**
 * Réglages › Langue (Ecrans › E-19): the phone's language, French or English, in a radio group.
 * The choice applies at once, without a restart; with an account, it is kept in `users.locale`
 * by `PATCH /me`, and goes back on a refusal.
 */
export function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { choice, phone } = useLanguageChoice();
  const { state } = useMe();
  const update = useUpdateMe();

  const choose = (next: LanguageChoice) => {
    if (next === choice) {
      return;
    }
    languageStore.set(next);
    if (state.status !== 'ready') {
      return;
    }
    update.mutate(
      { locale: accountLocaleOf(next) },
      {
        onError: () => {
          languageStore.set(choice);
          showToast('error', t('language.error'), { subtitle: t('language.errorBody') });
        },
      },
    );
  };

  /** « Français » for French, « English » for English: each language names itself. */
  const nativeName = (locale: AppLocale) => i18n.getFixedT(locale)(`language.${locale}`);
  /** Under a language, its own name when the interface writes it otherwise. */
  const nativeUnder = (locale: AppLocale) => {
    const name = nativeName(locale);
    return name === t(`language.${locale}`) ? null : { text: name, locale };
  };

  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={t('language.title')}
        back={{ label: t('language.back'), onPress: () => router.back() }}
      />
      <ScrollView
        contentContainerClassName="gap-16 px-16 pt-8"
        // Safe area measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + insets.bottom }}
      >
        <View accessibilityRole="radiogroup" accessibilityLabel={t('language.group')}>
          <LanguageRow
            mark={
              <View className="size-28 items-center justify-center rounded-pill bg-surface">
                <Icon {...uiIcon('phone-language')} size="icon-s" />
              </View>
            }
            label={t('language.device')}
            under={{ text: t(`language.${phone}`), locale: null }}
            isChecked={choice === 'device'}
            onPress={() => choose('device')}
          />
          {(['fr', 'en'] as const).map((locale) => (
            <LanguageRow
              key={locale}
              mark={flags[locale]}
              label={t(`language.${locale}`)}
              under={nativeUnder(locale)}
              isChecked={choice === locale}
              onPress={() => choose(locale)}
            />
          ))}
        </View>
        <Text variant="body-s" color="muted">
          {t('language.note')}
        </Text>
      </ScrollView>
    </View>
  );
}

interface LanguageRowProps {
  mark: ReactNode;
  label: string;
  /** In small under the label: the language the phone gives, or the name of the language in itself. */
  under: { text: string; locale: AppLocale | null } | null;
  isChecked: boolean;
  onPress: () => void;
}

/**
 * One radio of the group, the whole row a touch target of 56 points at least, its height free
 * for large text; the flag, the disc and the radio keep their size (D-064).
 */
function LanguageRow({ mark, label, under, isChecked, onPress }: LanguageRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={under ? `${label}, ${under.text}` : label}
      accessibilityState={{ checked: isChecked }}
      onPress={onPress}
      className="flex-row items-center gap-16 border-b border-line py-8"
      style={{ minHeight: ROW_MIN_HEIGHT }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {mark}
      </View>
      <View className="flex-1 gap-4">
        <Text variant="body">{label}</Text>
        {under && (
          <Text
            variant="body-s"
            color="muted"
            // The name of a language in itself, said in that language where the platform can.
            accessibilityLanguage={under.locale ?? undefined}
          >
            {under.text}
          </Text>
        )}
      </View>
      <Radio isChecked={isChecked} />
    </Pressable>
  );
}
