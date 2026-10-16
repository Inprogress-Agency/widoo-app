'use client';

import { SettingEditDialog } from '@/components/settings/SettingEditDialog';
import { useSettingUpdate } from '@/hooks/useSettingUpdate';
import { fieldsOf, valueOfFields, type SettingFields } from '@/lib/setting-form';
import { messages } from '@/messages/fr';
import type { AdminSetting } from '@widoo/shared';
import { Button } from '@widoo/ui';
import { useState } from 'react';

type SettingEditContainerProps = {
  setting: AdminSetting;
  /** The setting is saved: the page reads the settings and the history again. */
  onSaved: () => void;
};

/** The « Modifier » button of a setting and the window it opens (A-11), admins only. */
export function SettingEditContainer({ setting, onSaved }: SettingEditContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState<SettingFields>(() => fieldsOf(setting));
  const [reason, setReason] = useState('');
  const { isBusy, save } = useSettingUpdate(setting.key, () => {
    setIsOpen(false);
    onSaved();
  });

  const handleOpen = () => {
    setFields(fieldsOf(setting));
    setReason('');
    setIsOpen(true);
  };
  const handleConfirm = () => {
    const value = valueOfFields(setting, fields);
    if (value !== null) {
      void save(value, reason.trim());
    }
  };

  return (
    <>
      <Button onClick={handleOpen}>{messages.settings.edit.button}</Button>
      <SettingEditDialog
        isOpen={isOpen}
        setting={setting}
        fields={fields}
        onFieldChange={(name, text) => setFields((current) => ({ ...current, [name]: text }))}
        reason={reason}
        onReasonChange={setReason}
        onCancel={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        isBusy={isBusy}
      />
    </>
  );
}
