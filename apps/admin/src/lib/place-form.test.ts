import { describe, expect, it } from 'vitest';
import {
  coordinateText,
  emptyPlaceForm,
  placeFormOf,
  placeInputOf,
  positionOfForm,
  type PlaceFormValues,
} from './place-form';

const filled: PlaceFormValues = {
  ...emptyPlaceForm,
  name: ' Café Lomi ',
  category: 'cafe',
  address: '3 ter rue Marcadet, 75018 Paris',
  latitude: '48,8905',
  longitude: '2.3558',
  dayHours: ['8:00-18:00', '', '', '', '', '', ''],
};

describe('placeInputOf', () => {
  it('turns the form into the sheet the API expects', () => {
    expect(placeInputOf(filled, [])).toEqual({
      input: {
        name: 'Café Lomi',
        category: 'cafe',
        address: '3 ter rue Marcadet, 75018 Paris',
        location: { lat: 48.8905, lng: 2.3558 },
        isIndoor: false,
        priceRange: null,
        websiteUrl: null,
        phone: null,
        partnerBookingUrl: null,
        partnerProgramId: null,
        hours: [{ weekday: 0, opens: '08:00', closes: '18:00', validFrom: null, validTo: null }],
      },
    });
  });

  it.each([
    ['an empty latitude', { latitude: '' }],
    ['a latitude out of range', { latitude: '120' }],
    ['a longitude that is not a number', { longitude: 'est' }],
  ])('refuses %s', (_, changes) => {
    expect(placeInputOf({ ...filled, ...changes }, [])).toEqual({ error: 'position' });
  });

  it('refuses hours it cannot read', () => {
    const values = { ...filled, dayHours: ['le matin', '', '', '', '', '', ''] };
    expect(placeInputOf(values, [])).toEqual({ error: 'hours' });
  });
});

describe('placeFormOf', () => {
  it('fills the form with an existing place, and gives it back unchanged', () => {
    const place = {
      id: '0199d0a2-7c1e-7000-8000-000000000001',
      name: 'Café Lomi',
      category: 'cafe' as const,
      cityName: 'Paris',
      verificationStatus: 'verified' as const,
      verifiedAt: null,
      routeCount: 1,
      address: '3 ter rue Marcadet, 75018 Paris',
      location: { lat: 48.8905, lng: 2.3558 },
      isIndoor: true,
      priceRange: 'low' as const,
      websiteUrl: 'https://lomi.example',
      phone: '+33 1 00 00 00 00',
      partnerBookingUrl: null,
      partnerProgramId: null,
      hours: [{ weekday: 2, opens: '09:00', closes: '17:00', validFrom: null, validTo: null }],
      routes: [],
    };
    const result = placeInputOf(placeFormOf(place), place.hours);
    expect(result).toMatchObject({
      input: {
        name: place.name,
        location: place.location,
        isIndoor: true,
        priceRange: 'low',
        websiteUrl: place.websiteUrl,
        phone: place.phone,
        partnerBookingUrl: null,
        partnerProgramId: null,
        hours: place.hours,
      },
    });
  });
});

describe('positionOfForm', () => {
  it('reads the position the map shows, or none while a field cannot be read', () => {
    expect(positionOfForm({ latitude: '48,8905', longitude: '2.3558' })).toEqual({
      lat: 48.8905,
      lng: 2.3558,
    });
    expect(positionOfForm({ latitude: '', longitude: '2.3558' })).toBeNull();
    expect(positionOfForm({ latitude: '91', longitude: '2' })).toBeNull();
  });
});

describe('coordinateText', () => {
  it('writes a coordinate of the map as the form reads it', () => {
    expect(coordinateText(48.87850012345)).toBe('48,8785');
    expect(positionOfForm({ latitude: coordinateText(-33.8688197), longitude: '151,2' })).toEqual({
      lat: -33.86882,
      lng: 151.2,
    });
  });
});

describe('the partner link of Widoo', () => {
  const place = {
    id: 'p1',
    name: 'Café Lomi',
    category: 'cafe' as const,
    cityName: 'Paris',
    verificationStatus: 'verified' as const,
    verifiedAt: null,
    routeCount: 0,
    address: '3 ter rue Marcadet, 75018 Paris',
    location: { lat: 48.8905, lng: 2.3558 },
    isIndoor: true,
    priceRange: null,
    websiteUrl: null,
    phone: null,
    partnerBookingUrl: 'https://partner.example/lomi',
    partnerProgramId: '0199d1ec-0000-7000-8000-000000000000',
    hours: [],
    routes: [],
  };

  it('is filled from the place and sent with its program', () => {
    const values = placeFormOf(place);
    expect(values).toMatchObject({
      partnerBookingUrl: 'https://partner.example/lomi',
      partnerProgramId: place.partnerProgramId,
    });
    expect(placeInputOf(values, [])).toMatchObject({
      input: {
        partnerBookingUrl: 'https://partner.example/lomi',
        partnerProgramId: place.partnerProgramId,
      },
    });
  });

  it('is sent as none, with no program, when the link is emptied', () => {
    const values = { ...placeFormOf(place), partnerBookingUrl: ' ' };
    expect(placeInputOf(values, [])).toMatchObject({
      input: { partnerBookingUrl: null, partnerProgramId: null },
    });
  });
});
