import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Keyboard } from 'react-native';
import { AnecdoteSheet, type AnecdoteSheetMethods } from './AnecdoteSheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const questions = [
  { key: 'stroll_neighborhood', label: 'Mon quartier pour flâner', position: 1 },
  { key: 'hidden_gem', label: 'Un bon plan que personne ne connaît', position: 3 },
];

async function renderSheet() {
  const ref = createRef<AnecdoteSheetMethods>();
  const onSave = jest.fn();
  const onDelete = jest.fn();
  await render(
    <AnecdoteSheet
      ref={ref}
      questions={questions}
      usedKeys={['stroll_neighborhood']}
      onSave={onSave}
      onDelete={onDelete}
    />,
  );
  return { ref, onSave, onDelete };
}

describe('anecdote sheet', () => {
  it('greys the questions already on the profile, then adds an answer to the one chosen', async () => {
    const { ref, onSave } = await renderSheet();
    await act(async () => ref.current?.open(null));
    const used = screen.getByRole('button', {
      name: 'Mon quartier pour flâner, Déjà sur votre profil',
    });
    expect(used.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Un bon plan que personne ne connaît' }),
    );
    expect(
      screen.getByRole('header', { name: 'Un bon plan que personne ne connaît' }),
    ).toBeTruthy();
    const answer = screen.getByLabelText('Votre réponse');
    expect(answer.props.accessibilityHint).toBe('0 caractère sur 150');
    await fireEvent.changeText(answer, '  Le jardin derrière la mairie.  ');
    await fireEvent.press(screen.getByRole('button', { name: "Ajouter l'anecdote" }));
    expect(onSave).toHaveBeenCalledWith(
      {
        questionKey: 'hidden_gem',
        questionLabel: 'Un bon plan que personne ne connaît',
        answer: 'Le jardin derrière la mairie.',
      },
      null,
    );
  });

  it('opens an existing anecdote on its answer, with its deletion', async () => {
    const { ref } = await renderSheet();
    await act(async () =>
      ref.current?.open(0, {
        questionKey: 'stroll_neighborhood',
        questionLabel: 'Mon quartier pour flâner',
        answer: 'Belleville.',
      }),
    );
    expect(screen.getByDisplayValue('Belleville.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Changer de question' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Supprimer l'anecdote" })).toBeTruthy();
  });

  it('closes the keyboard of the form before the sheet rises', async () => {
    const { ref } = await renderSheet();
    const { BottomSheetModal } = jest.requireMock<{
      BottomSheetModal: { prototype: { present: () => void } };
    }>('@gorhom/bottom-sheet');
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const present = jest.spyOn(BottomSheetModal.prototype, 'present');
    await act(async () => ref.current?.open(null));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(present).toHaveBeenCalledTimes(1);
    expect(dismiss.mock.invocationCallOrder[0]).toBeLessThan(
      present.mock.invocationCallOrder[0] ?? 0,
    );
    dismiss.mockRestore();
    present.mockRestore();
  });
});
