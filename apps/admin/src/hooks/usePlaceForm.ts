import { getSessionClients } from '@/lib/auth/clients';
import { placeInputOf, type PlaceFormValues } from '@/lib/place-form';
import { failureOf, type PlaceSaveFailure } from '@/lib/place-save-failure';
import type { CatalogPlaceDetail, PlaceHours } from '@widoo/shared';
import { useState } from 'react';

/**
 * The form of a place (A-04): its values, and saving them as a new place or over `placeId`.
 * `previousHours` are the hours of the place being edited, whose seasonal slots are kept.
 */
export function usePlaceForm(options: {
  initial: PlaceFormValues;
  placeId: string | null;
  previousHours: readonly PlaceHours[];
  onSaved: (place: CatalogPlaceDetail) => void;
}) {
  const [values, setValues] = useState(options.initial);
  const [failure, setFailure] = useState<PlaceSaveFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async () => {
    const result = placeInputOf(values, options.previousHours);
    if ('error' in result) {
      setFailure(result.error);
      return;
    }
    setFailure(null);
    setIsBusy(true);
    try {
      const { api } = getSessionClients();
      const place = options.placeId
        ? await api.updateCatalogPlace(options.placeId, result.input)
        : await api.createCatalogPlace(result.input);
      options.onSaved(place);
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setIsBusy(false);
    }
  };

  return {
    values,
    failure,
    isBusy,
    handleChange: <Key extends keyof PlaceFormValues>(key: Key, value: PlaceFormValues[Key]) =>
      setValues((current) => ({ ...current, [key]: value })),
    handleSubmit: () => void handleSubmit(),
  };
}
