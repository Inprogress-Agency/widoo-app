'use client';

import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { PlaceForm } from '@/components/catalog/PlaceForm';
import { BackLink } from '@/components/states/BackLink';
import { usePlaceForm } from '@/hooks/usePlaceForm';
import { emptyPlaceForm, placeFormOf } from '@/lib/place-form';
import { messages } from '@/messages/fr';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import type { CatalogPlaceDetail } from '@widoo/shared';
import { Notice, showToast } from '@widoo/ui';
import { useRouter } from 'next/navigation';

const texts = messages.catalog.places.form;

/** Address of the list of places with the sheet of one of them open next to it. */
export const placePanelPathOf = (placeId: string) =>
  `${catalogPaths.places}?${new URLSearchParams({ lieu: placeId }).toString()}`;

/**
 * The form of a place on its own page (A-04): empty to create one, filled with `place` to edit
 * it. Once saved, back to the list with the sheet of the place open.
 */
export function PlaceFormContainer({ place }: { place: CatalogPlaceDetail | null }) {
  const router = useRouter();
  const form = usePlaceForm({
    initial: place ? placeFormOf(place) : emptyPlaceForm,
    placeId: place?.id ?? null,
    previousHours: place?.hours ?? [],
    onSaved: (saved) => {
      showToast('success', { title: place ? texts.saved : texts.created });
      router.push(placePanelPathOf(saved.id));
    },
  });

  return (
    <div className="flex flex-col gap-20">
      <BackLink href={catalogPaths.places} label={texts.back} />
      <h2 className="text-title-xl">{place ? place.name : texts.createTitle}</h2>
      <PlaceForm
        notice={
          form.failure ? (
            <Notice
              tone="error"
              role="alert"
              icon={<WarningCircleIcon aria-hidden weight="fill" className="size-20 shrink-0" />}
            >
              <p>{texts.errors[form.failure]}</p>
            </Notice>
          ) : null
        }
        values={form.values}
        onChange={form.handleChange}
        onSubmit={form.handleSubmit}
        onCancel={() => router.push(place ? placePanelPathOf(place.id) : catalogPaths.places)}
        isBusy={form.isBusy}
      />
    </div>
  );
}
