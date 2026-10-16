import { describe, expect, it } from 'vitest';
import { resolveBookingLink } from './booking-link';

const noPartner = { partnerBookingUrl: null, partnerProgramIsActive: null };
const partner = { partnerBookingUrl: 'https://partner.example/lieu', partnerProgramIsActive: true };

describe('resolveBookingLink', () => {
  it('puts the link of the creator before the partner link', () => {
    expect(
      resolveBookingLink(
        { bookingUrl: 'https://creator.example', bookingIsAffiliate: false },
        partner,
      ),
    ).toEqual({ url: 'https://creator.example', origin: 'creator' });
  });

  it('says when the link of the creator is an affiliate link', () => {
    expect(
      resolveBookingLink(
        { bookingUrl: 'https://creator.example', bookingIsAffiliate: true },
        noPartner,
      ),
    ).toEqual({ url: 'https://creator.example', origin: 'creator_affiliate' });
  });

  it('falls back to the partner link when the creator set none', () => {
    expect(resolveBookingLink({ bookingUrl: null, bookingIsAffiliate: false }, partner)).toEqual({
      url: 'https://partner.example/lieu',
      origin: 'partner',
    });
  });

  it('uses a partner link that names no program, but not one whose program is inactive', () => {
    const step = { bookingUrl: null, bookingIsAffiliate: false };
    expect(
      resolveBookingLink(step, {
        partnerBookingUrl: 'https://p.example',
        partnerProgramIsActive: null,
      }),
    ).toMatchObject({ origin: 'partner' });
    expect(
      resolveBookingLink(step, {
        partnerBookingUrl: 'https://p.example',
        partnerProgramIsActive: false,
      }),
    ).toBeNull();
  });

  it('is null without any link', () => {
    expect(
      resolveBookingLink({ bookingUrl: null, bookingIsAffiliate: false }, noPartner),
    ).toBeNull();
  });
});
