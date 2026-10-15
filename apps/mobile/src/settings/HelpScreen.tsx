import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { SettingsPage } from './SettingsPage';

/** The questions of « Questions fréquentes », in order; their answers are written by the team. */
const questions = ['plan', 'premium', 'closedPlace', 'deleteAccount'] as const;
type Question = (typeof questions)[number];

/**
 * Réglages › Aide et contact (Ecrans › E-19, D-063): the frequent questions, one open at a time,
 * then « Nous écrire », which opens the form.
 */
export function HelpScreen() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Question | null>(null);
  return (
    <SettingsPage title={t('help.title')} backLabel={t('help.back')}>
      <View className="gap-4">
        <Text variant="status" color="muted" accessibilityRole="header">
          {t('help.faq')}
        </Text>
        {questions.map((question) => (
          <FaqItem
            key={question}
            question={t(`help.${question}Question`)}
            answer={t(`help.${question}Answer`)}
            isOpen={open === question}
            onPress={() => setOpen(open === question ? null : question)}
          />
        ))}
      </View>
      <View className="gap-8 pt-16">
        <Text variant="status" color="muted" accessibilityRole="header">
          {t('help.writeTitle')}
        </Text>
        <Text variant="body-s" color="muted">
          {t('help.writeBody')}
        </Text>
        <Button
          label={t('help.write')}
          isFullWidth
          onPress={() => router.push('/settings/contact')}
        />
      </View>
    </SettingsPage>
  );
}

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onPress: () => void;
}

/** A question that unfolds its answer: « Comment programmer une sortie ?, bouton, développé ». */
function FaqItem({ question, answer, isOpen, onPress }: FaqItemProps) {
  return (
    <View className="border-b border-line">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded: isOpen }}
        onPress={onPress}
        className="min-h-touch-min flex-row items-center gap-12 py-16"
      >
        <Text variant="body" className="flex-1">
          {question}
        </Text>
        <Icon {...uiIcon(isOpen ? 'collapse-step' : 'expand-step')} size="icon-m" />
      </Pressable>
      {isOpen && (
        <Text variant="body-s" color="muted" className="pb-16">
          {answer}
        </Text>
      )}
    </View>
  );
}
