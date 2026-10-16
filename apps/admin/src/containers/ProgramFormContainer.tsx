'use client';

import { ProgramFormDialog } from '@/components/affiliation/ProgramFormDialog';
import { useProgramActions } from '@/hooks/useProgramActions';
import {
  emptyProgramForm,
  programFormOf,
  programInputOf,
  programPatchOf,
  type ProgramFormValues,
} from '@/lib/program-form';
import type { AffiliateProgram } from '@widoo/shared';
import { useState } from 'react';

type ProgramFormContainerProps = {
  /** The program to change; null to add one. */
  program: AffiliateProgram | null;
  onClose: () => void;
  /** The program is saved: the list reads again. */
  onSaved: () => void;
};

/**
 * The window that adds a program or changes one (A-09): the form, and what it sends. It is shown
 * only while it is open, so that each opening starts from the program or from nothing.
 */
export function ProgramFormContainer({ program, onClose, onSaved }: ProgramFormContainerProps) {
  const [values, setValues] = useState<ProgramFormValues>(() =>
    program ? programFormOf(program) : emptyProgramForm,
  );
  const actions = useProgramActions(() => {
    onClose();
    onSaved();
  });

  const handleChange = <Key extends keyof ProgramFormValues>(
    key: Key,
    value: ProgramFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }));
  const handleConfirm = () => {
    if (program) {
      const patch = programPatchOf(program, values);
      if (patch && Object.keys(patch).length > 0) {
        void actions.update(program.id, patch);
      } else {
        onClose();
      }
      return;
    }
    const input = programInputOf(values);
    if (input) {
      void actions.create(input);
    }
  };

  return (
    <ProgramFormDialog
      isOpen
      isEdit={program !== null}
      values={values}
      onChange={handleChange}
      onCancel={onClose}
      onConfirm={handleConfirm}
      isBusy={actions.isBusy}
    />
  );
}
