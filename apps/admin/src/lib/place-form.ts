import { dayTextsToHours, hoursToDayTexts } from '@/lib/place-hours';
import type { CatalogPlaceDetail, CatalogPlaceInput, PlaceHours } from '@widoo/shared';

/** The sheet of a place as the form holds it: everything is text until it is saved. */
export type PlaceFormValues = {
  name: string;
  category: CatalogPlaceInput['category'];
  address: string;
  latitude: string;
  longitude: string;
  isIndoor: boolean;
  /** Empty for a price level that is not given. */
  priceRange: string;
  websiteUrl: string;
  phone: string;
  /** One line per day, Monday first. */
  dayHours: string[];
};

export type PlaceFormError = 'position' | 'hours';

/** The form of a new place. */
export const emptyPlaceForm: PlaceFormValues = {
  name: '',
  category: 'restaurant',
  address: '',
  latitude: '',
  longitude: '',
  isIndoor: false,
  priceRange: '',
  websiteUrl: '',
  phone: '',
  dayHours: ['', '', '', '', '', '', ''],
};

/** The form filled with the sheet of an existing place. */
export function placeFormOf(place: CatalogPlaceDetail): PlaceFormValues {
  return {
    name: place.name,
    category: place.category,
    address: place.address,
    latitude: String(place.location.lat),
    longitude: String(place.location.lng),
    isIndoor: place.isIndoor,
    priceRange: place.priceRange ?? '',
    websiteUrl: place.websiteUrl ?? '',
    phone: place.phone ?? '',
    dayHours: hoursToDayTexts(place.hours),
  };
}

/** A coordinate typed with a comma or a point; NaN for anything else. */
const coordinateOf = (text: string) =>
  /^-?\d+([.,]\d+)?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : Number.NaN;

/** The position the form holds, when its latitude and its longitude can both be read. */
export function positionOfForm(
  values: Pick<PlaceFormValues, 'latitude' | 'longitude'>,
): CatalogPlaceInput['location'] | null {
  const lat = coordinateOf(values.latitude);
  const lng = coordinateOf(values.longitude);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** A coordinate as the form writes it: six decimals at most (about 10 cm), with a comma. */
export const coordinateText = (value: number) =>
  String(Math.round(value * 1e6) / 1e6).replace('.', ',');

/**
 * What to send to the API for a form, or which part of it cannot be read. The API checks the
 * rest (texts, link, phone): only what the form itself turns into another shape is checked here.
 * `previousHours` gives back the seasonal slots, which the form does not show.
 */
export function placeInputOf(
  values: PlaceFormValues,
  previousHours: readonly PlaceHours[],
): { input: CatalogPlaceInput } | { error: PlaceFormError } {
  const location = positionOfForm(values);
  if (!location) {
    return { error: 'position' };
  }
  const hours = dayTextsToHours(values.dayHours, previousHours);
  if (!hours) {
    return { error: 'hours' };
  }
  return {
    input: {
      name: values.name.trim(),
      category: values.category,
      address: values.address.trim(),
      location,
      isIndoor: values.isIndoor,
      priceRange: (values.priceRange || null) as CatalogPlaceInput['priceRange'],
      websiteUrl: values.websiteUrl.trim() || null,
      phone: values.phone.trim() || null,
      hours,
    },
  };
}
