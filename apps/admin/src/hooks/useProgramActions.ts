import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import type { AffiliateProgramInput, AffiliateProgramPatch } from '@widoo/shared';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.affiliation.programs.toasts;

/** The toast of a failed save: a name already taken, a refused field, or any other failure. */
function failureTitleOf(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) return texts.nameTaken;
    if (error.status === 400 || error.status === 422) return texts.invalid;
  }
  return texts.failed;
}

/**
 * Adds or changes an affiliate program (A-09) and tells the result in a toast. `onSaved` is called
 * once it is saved: the list is then read again.
 */
export function useProgramActions(onSaved: () => void) {
  const [isBusy, setIsBusy] = useState(false);
  const { api } = getSessionClients();

  const send = async (action: () => Promise<unknown>, successTitle: string) => {
    setIsBusy(true);
    try {
      await action();
      showToast('success', { title: successTitle });
      onSaved();
    } catch (error) {
      showToast('error', { title: failureTitleOf(error) });
    } finally {
      setIsBusy(false);
    }
  };

  return {
    isBusy,
    create: (program: AffiliateProgramInput) =>
      send(() => api.createAffiliateProgram(program), texts.created),
    update: (programId: string, patch: AffiliateProgramPatch) =>
      send(() => api.updateAffiliateProgram(programId, patch), texts.updated),
  };
}
