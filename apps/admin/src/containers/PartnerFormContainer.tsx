'use client';

import { PartnerFormDialog } from '@/components/b2b/PartnerFormDialog';
import { usePartnerActions } from '@/hooks/usePartnerActions';
import {
  emptyPartnerForm,
  partnerFormOf,
  partnerInputOf,
  partnerPatchOf,
  slugFromName,
  type PartnerFormValues,
} from '@/lib/partner-form';
import type { B2bClient } from '@widoo/shared';
import { useState } from 'react';

type PartnerFormContainerProps = {
  /** The partner to change; null to register one. */
  partner: B2bClient | null;
  onClose: () => void;
  /** The partner is saved: the list reads again. */
  onSaved: (partner: B2bClient) => void;
};

/**
 * The window that registers a partner or changes one (A-10): the form, and what it sends. It is
 * shown only while it is open, so that each opening starts from the partner or from nothing.
 */
export function PartnerFormContainer({ partner, onClose, onSaved }: PartnerFormContainerProps) {
  const [values, setValues] = useState<PartnerFormValues>(() =>
    partner ? partnerFormOf(partner) : emptyPartnerForm,
  );
  const actions = usePartnerActions((saved) => {
    onClose();
    onSaved(saved);
  });

  const handleChange = <Key extends keyof PartnerFormValues>(
    key: Key,
    value: PartnerFormValues[Key],
  ) =>
    setValues((current) => {
      const next = { ...current, [key]: value };
      // A slug nobody typed follows the name, until its own field is touched.
      if (key === 'name' && !partner && current.slug === slugFromName(current.name)) {
        next.slug = slugFromName(String(value));
      }
      return next;
    });
  const handleConfirm = () => {
    if (partner) {
      const patch = partnerPatchOf(partner, values);
      if (patch && Object.keys(patch).length > 0) {
        void actions.update(partner.id, patch);
      } else {
        onClose();
      }
      return;
    }
    const input = partnerInputOf(values);
    if (input) {
      void actions.create(input);
    }
  };

  return (
    <PartnerFormDialog
      isOpen
      isEdit={partner !== null}
      values={values}
      onChange={handleChange}
      onCancel={onClose}
      onConfirm={handleConfirm}
      isBusy={actions.isBusy}
    />
  );
}
