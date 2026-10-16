import type { PlaceFormValues } from '@/lib/place-form';
import { messages } from '@/messages/fr';
import { labels, taxonomies } from '@widoo/shared';
import { Button, Checkbox, Field, Input, Select } from '@widoo/ui';
import type { FormEvent, ReactNode } from 'react';

const texts = messages.catalog.places.form;

type PlaceFormProps = {
  /** An error of the form or of the API, above the fields. */
  notice: ReactNode;
  /** The map that shows and moves the position, under its two fields; nothing without one. */
  positionMap: ReactNode;
  values: PlaceFormValues;
  /** Changes one field of the form. */
  onChange: <Key extends keyof PlaceFormValues>(key: Key, value: PlaceFormValues[Key]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isBusy: boolean;
};

/**
 * The sheet of a place as a form (A-04), for a new place and for an existing one: name, kind,
 * address and position, practical details, then its opening hours day by day.
 */
export function PlaceForm({
  notice,
  positionMap,
  values,
  onChange,
  onSubmit,
  onCancel,
  isBusy,
}: PlaceFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const handleDayChange = (day: number, text: string) =>
    onChange(
      'dayHours',
      values.dayHours.map((current, index) => (index === day ? text : current)),
    );

  return (
    <form onSubmit={handleSubmit} className="flex max-w-dialog flex-col gap-16">
      {notice}
      <Field label={texts.name} htmlFor="place-name" isRequired>
        <Input
          id="place-name"
          required
          maxLength={120}
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </Field>
      <Field label={texts.category} htmlFor="place-category" isRequired>
        <Select
          id="place-category"
          value={values.category}
          onChange={(event) =>
            onChange('category', event.target.value as PlaceFormValues['category'])
          }
        >
          {taxonomies.placeCategories.map((category) => (
            <option key={category} value={category}>
              {labels.fr.placeCategories[category]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={texts.address} htmlFor="place-address" isRequired hint={texts.addressHint}>
        <Input
          id="place-address"
          required
          maxLength={240}
          aria-describedby="place-address-hint"
          value={values.address}
          onChange={(event) => onChange('address', event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-12">
        <Field label={texts.latitude} htmlFor="place-latitude" isRequired>
          <Input
            id="place-latitude"
            required
            inputMode="decimal"
            aria-describedby="place-position-hint"
            value={values.latitude}
            onChange={(event) => onChange('latitude', event.target.value)}
          />
        </Field>
        <Field label={texts.longitude} htmlFor="place-longitude" isRequired>
          <Input
            id="place-longitude"
            required
            inputMode="decimal"
            aria-describedby="place-position-hint"
            value={values.longitude}
            onChange={(event) => onChange('longitude', event.target.value)}
          />
        </Field>
      </div>
      <p id="place-position-hint" className="text-label text-muted-foreground">
        {texts.positionHint}
      </p>
      {positionMap}
      <Checkbox
        label={texts.indoor}
        description={texts.indoorHint}
        checked={values.isIndoor}
        onChange={(event) => onChange('isIndoor', event.target.checked)}
      />
      <Field label={texts.price} htmlFor="place-price">
        <Select
          id="place-price"
          value={values.priceRange}
          onChange={(event) => onChange('priceRange', event.target.value)}
        >
          <option value="">{texts.noPrice}</option>
          {taxonomies.priceRanges.map((range) => (
            <option key={range} value={range}>
              {labels.fr.priceRanges[range]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={texts.website} htmlFor="place-website" hint={texts.websiteHint}>
        <Input
          id="place-website"
          type="url"
          aria-describedby="place-website-hint"
          value={values.websiteUrl}
          onChange={(event) => onChange('websiteUrl', event.target.value)}
        />
      </Field>
      <Field label={texts.phone} htmlFor="place-phone">
        <Input
          id="place-phone"
          type="tel"
          value={values.phone}
          onChange={(event) => onChange('phone', event.target.value)}
        />
      </Field>
      <fieldset className="flex flex-col gap-8">
        <legend className="text-label-strong">{texts.hours}</legend>
        <p id="place-hours-hint" className="pt-4 text-label text-muted-foreground">
          {texts.hoursHint}
        </p>
        {messages.catalog.places.weekdays.map((day, index) => (
          <label key={day} className="grid grid-cols-hours items-center gap-12 text-body-s">
            {day}
            <Input
              aria-describedby="place-hours-hint"
              value={values.dayHours[index] ?? ''}
              onChange={(event) => handleDayChange(index, event.target.value)}
            />
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end gap-8">
        <Button variant="secondary" onClick={onCancel}>
          {texts.cancel}
        </Button>
        <Button type="submit" disabled={isBusy}>
          {texts.save}
        </Button>
      </div>
    </form>
  );
}
