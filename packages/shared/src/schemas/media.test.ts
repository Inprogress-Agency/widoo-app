import { describe, expect, it } from 'vitest';
import { PhotoUploadRequest, PhotoUploadTicket } from './media';

const ownerId = '0198c1de-0000-7000-8000-000000000001';

describe('PhotoUploadRequest', () => {
  it('takes a photo of a route, a step or a place, in JPEG, PNG or WebP', () => {
    for (const ownerType of ['route', 'step', 'place']) {
      for (const contentType of ['image/jpeg', 'image/png', 'image/webp']) {
        expect(PhotoUploadRequest.safeParse({ ownerType, ownerId, contentType }).success).toBe(
          true,
        );
      }
    }
  });

  it.each([
    ['a revision, until #434', { ownerType: 'revision' }],
    ['an account, until #426', { ownerType: 'user' }],
    ['a file that is not a photo', { contentType: 'application/pdf' }],
    ['an animated GIF', { contentType: 'image/gif' }],
    ['an owner that is not an id', { ownerId: 'route-1' }],
    ['a key of its own', { size: 1000 }],
  ])('refuses %s', (_, change) => {
    const body = { ownerType: 'step', ownerId, contentType: 'image/jpeg', ...change };
    expect(PhotoUploadRequest.safeParse(body).success).toBe(false);
  });
});

describe('PhotoUploadTicket', () => {
  it('sends the file by PUT on an https URL', () => {
    const ticket = {
      mediaId: ownerId,
      method: 'PUT',
      uploadUrl: 'https://storage.googleapis.com/widoo-test-uploads/uploads/a?X-Goog-Signature=0',
      headers: { 'content-type': 'image/jpeg' },
      expiresAt: '2026-11-03T12:15:00.000Z',
    };
    expect(PhotoUploadTicket.safeParse(ticket).success).toBe(true);
    expect(PhotoUploadTicket.safeParse({ ...ticket, method: 'POST' }).success).toBe(false);
    const plain = { ...ticket, uploadUrl: 'http://storage.googleapis.com/a' };
    expect(PhotoUploadTicket.safeParse(plain).success).toBe(false);
  });
});
