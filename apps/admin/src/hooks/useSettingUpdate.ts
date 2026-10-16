import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import type { SettingValue } from '@widoo/shared';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.settings.toasts;

/**
 * Saves a setting (A-11) and tells the result in a toast. `onSaved` is called once it is saved:
 * the page then reads the settings and their history again. A value the API refuses (out of its
 * bounds) or a missing reason is told apart from any other failure.
 */
export function useSettingUpdate(settingKey: string, onSaved: () => void) {
  const [isBusy, setIsBusy] = useState(false);

  const save = async (value: SettingValue, reason: string) => {
    setIsBusy(true);
    try {
      await getSessionClients().api.updateAdminSetting(settingKey, { value, reason });
      showToast('success', { title: texts.saved });
      onSaved();
    } catch (error) {
      const isRefused =
        error instanceof ApiRequestError && (error.status === 400 || error.status === 422);
      showToast('error', { title: isRefused ? texts.invalid : texts.failed });
    } finally {
      setIsBusy(false);
    }
  };

  return { isBusy, save };
}
