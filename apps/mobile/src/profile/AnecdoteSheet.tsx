import {
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { anecdoteAnswerMaxLength, type AnecdoteQuestion } from '@widoo/shared';
import { size } from '@widoo/tokens';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, Pressable, useWindowDimensions, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { ModalSheetBackground, ModalSheetHandle, modalSheetBackdrop } from '../ui/ModalSheetParts';
import { setModalSheetOpen } from '../ui/ModalSheetShield';
import { timing } from '../ui/motion';
import { SheetTextField } from '../ui/SheetTextField';
import { Text } from '../ui/Text';
import { TextLink } from '../ui/TextLink';
import type { DraftAnecdote } from './draft';

export interface AnecdoteSheetMethods {
  /** A new anecdote (`index` null) starts on the questions; an existing one on its answer. */
  open: (index: number | null, anecdote?: DraftAnecdote) => void;
}

interface AnecdoteSheetProps {
  ref?: Ref<AnecdoteSheetMethods>;
  /** The active questions of `/config`, in the order of the sheet. */
  questions: readonly AnecdoteQuestion[];
  /** The questions already on the profile, greyed in the list. */
  usedKeys: readonly string[];
  onSave: (anecdote: DraftAnecdote, index: number | null) => void;
  onDelete: (index: number) => void;
}

interface Editing {
  index: number | null;
  question: AnecdoteQuestion | null;
  answer: string;
  step: 'question' | 'answer';
}

/**
 * The anecdote sheet of Modifier le profil (Ecrans › E-09, M-05): step 1, « Choisissez une
 * question », those on the profile greyed; step 2, the question, « Changer », the answer of 150
 * characters with its counter. An existing anecdote opens on step 2 with « Supprimer l'anecdote »
 * (system alert). Nothing is published before « Enregistrer » of the page.
 */
export function AnecdoteSheet({ ref, questions, usedKeys, onSave, onDelete }: AnecdoteSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = useRef<BottomSheetModal>(null);
  const openConfig = useBottomSheetTimingConfigs(timing('page', 'move'));
  const closeConfig = useBottomSheetTimingConfigs(timing('base', 'move', 'exit'));
  const [editing, setEditing] = useState<Editing>({
    index: null,
    question: null,
    answer: '',
    step: 'question',
  });
  useImperativeHandle(ref, () => ({
    open: (index, anecdote) => {
      const question = anecdote
        ? (questions.find((candidate) => candidate.key === anecdote.questionKey) ?? {
            key: anecdote.questionKey,
            label: anecdote.questionLabel,
            position: 0,
          })
        : null;
      setEditing({
        index,
        question,
        answer: anecdote?.answer ?? '',
        step: anecdote ? 'answer' : 'question',
      });
      // A field of the form may still hold the keyboard: the sheet would rise under it, and
      // would not follow the keyboard of its own answer either (Android).
      Keyboard.dismiss();
      setModalSheetOpen(true);
      sheet.current?.present();
    },
  }));
  useEffect(() => () => setModalSheetOpen(false), []);
  const close = () => sheet.current?.dismiss(closeConfig);

  const isExisting = editing.index !== null;
  const answer = editing.answer.trim();
  const save = () => {
    if (editing.question && answer !== '') {
      onSave(
        { questionKey: editing.question.key, questionLabel: editing.question.label, answer },
        editing.index,
      );
      close();
    }
  };
  const confirmDelete = () => {
    const { index } = editing;
    if (index === null) {
      return;
    }
    Alert.alert(t('anecdote.deleteConfirm.title'), t('anecdote.deleteConfirm.body'), [
      { text: t('anecdote.deleteConfirm.cancel'), style: 'cancel' },
      {
        text: t('anecdote.deleteConfirm.confirm'),
        style: 'destructive',
        onPress: () => {
          onDelete(index);
          close();
        },
      },
    ]);
  };

  return (
    <BottomSheetModal
      ref={sheet}
      animationConfigs={openConfig}
      overrideReduceMotion={ReduceMotion.System}
      backdropComponent={modalSheetBackdrop(t('anecdote.close'))}
      backgroundComponent={ModalSheetBackground}
      handleComponent={ModalSheetHandle}
      // Up to the status bar at most (D-028), then the content scrolls.
      maxDynamicContentSize={height - insets.top}
      keyboardBehavior="interactive"
      onDismiss={() => setModalSheetOpen(false)}
      accessible={false}
    >
      <BottomSheetScrollView
        accessibilityViewIsModal
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-16 px-16 pt-8"
        contentContainerStyle={{ paddingBottom: insets.bottom + size['touch-min'] / 2 }}
      >
        {editing.step === 'question' ? (
          <>
            <Text variant="title-m" accessibilityRole="header">
              {t('anecdote.chooseTitle')}
            </Text>
            {questions.length === 0 && (
              <Text variant="body-s" color="muted">
                {t('anecdote.noQuestions')}
              </Text>
            )}
            {questions.map((question) => {
              const isUsed =
                usedKeys.includes(question.key) && question.key !== editing.question?.key;
              return (
                <Pressable
                  key={question.key}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isUsed ? `${question.label}, ${t('anecdote.used')}` : question.label
                  }
                  accessibilityState={{ disabled: isUsed }}
                  disabled={isUsed}
                  onPress={() => setEditing({ ...editing, question, step: 'answer' })}
                  className="min-h-touch-min flex-row items-center gap-12 border-b border-line py-12"
                >
                  <View className="flex-1 gap-4">
                    <Text variant="body-medium" color={isUsed ? 'muted' : 'ink'}>
                      {question.label}
                    </Text>
                    {isUsed && (
                      <Text variant="body-s" color="muted">
                        {t('anecdote.used')}
                      </Text>
                    )}
                  </View>
                  {!isUsed && <Icon {...uiIcon('open-row')} size="icon-m" color="muted" />}
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            <View className="flex-row flex-wrap items-center justify-between gap-x-12 gap-y-4">
              <Text variant="title-m" accessibilityRole="header" className="shrink">
                {editing.question?.label}
              </Text>
              <TextLink
                role="button"
                label={isExisting ? t('anecdote.changeQuestion') : t('anecdote.change')}
                onPress={() => setEditing({ ...editing, step: 'question' })}
              />
            </View>
            <SheetTextField
              label={t('anecdote.answer')}
              help={t('field.counter', {
                count: editing.answer.length,
                max: anecdoteAnswerMaxLength,
              })}
              value={editing.answer}
              onChangeText={(text) => setEditing({ ...editing, answer: text })}
              maxLength={anecdoteAnswerMaxLength}
              autoCapitalize="sentences"
              isMultiline
              isFocusedOnOpen
            />
            <Button
              isFullWidth
              isDisabled={answer === ''}
              label={isExisting ? t('anecdote.save') : t('anecdote.add')}
              onPress={save}
            />
            {isExisting && (
              <Button
                variant="secondary"
                isFullWidth
                label={t('anecdote.delete')}
                onPress={confirmDelete}
              />
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
