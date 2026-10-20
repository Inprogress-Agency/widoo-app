import { RouteDetail, type RouteDetailStep } from '@widoo/shared';
import { describe, expect, it } from 'vitest';
import fixtures from '../route/generated/route-sheets.json';
import { bigPhotoOf, goPhotoUrls } from './goPhotos';
import { museumPhotos, plannedFixture, stepIds } from './testPlanned';

const planned = plannedFixture();
const [place, museum] = planned.route.steps;
const placePhoto = { url: 'https://example.com/photos/place-fictive.jpg', credit: null };
// The first demo sheet, its steps renamed after those of the fictitious Go, the first one with
// the photo of its place.
const sheet = RouteDetail.parse(fixtures.routes[0]);
const route: RouteDetail = {
  ...sheet,
  steps: sheet.steps.map((step, index) => ({
    ...(step as RouteDetailStep),
    id: stepIds[index] ?? step.id,
    place: { ...(step as RouteDetailStep).place, photo: index === 0 ? placePhoto : null },
  })),
};
const cover = sheet.photos[0];

describe('the big photo of the Go (E-07)', () => {
  it('is the first photo of the step, offline as online', () => {
    expect(bigPhotoOf(museum ?? null, null)).toEqual(museumPhotos[0]);
    expect(bigPhotoOf(museum ?? null, route)).toEqual(museumPhotos[0]);
  });

  it('is else the photo of the place, else the cover of the route', () => {
    expect(bigPhotoOf(place ?? null, route)).toEqual(placePhoto);
    expect(bigPhotoOf(planned.route.steps[2] ?? null, route)).toEqual(cover);
    expect(bigPhotoOf(place ?? null, null)).toBeNull();
  });

  it('never shows the place of a locked step', () => {
    const locked = { ...route, steps: route.steps.map((step) => ({ ...step, isLocked: true })) };
    expect(bigPhotoOf(place ?? null, locked as unknown as RouteDetail)).toEqual(cover);
  });
});

describe('the photos kept for the way', () => {
  it('lists those of the steps, then the places and the cover, once each', () => {
    expect(goPhotoUrls(planned, null)).toEqual(museumPhotos.map((photo) => photo.url));
    expect(goPhotoUrls(planned, route)).toEqual([
      ...museumPhotos.map((photo) => photo.url),
      placePhoto.url,
      cover?.url,
    ]);
  });
});
