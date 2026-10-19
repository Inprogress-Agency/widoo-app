import {
  AffiliateProgram,
  AffiliatePrograms,
  ApiError,
  BookableSteps,
  type BookableStep,
  type UserRole,
} from '@widoo/shared';
import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStepFixtures } from '../affiliation/test-fixtures';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, affiliatePrograms, bookingClicks, places, users } from '../db/schema';
import { seed } from '../db/seed';
import { uuidv7 } from '../db/uuid';
import { testConfig } from '../test-config';

// Shared database, parallel files: the programs of this file carry a marker in their name, and
// only those are read back or deleted.
const verifier = new TestTokenVerifier();
const createdUids: string[] = [];
const marker = `affitest${uuidv7().slice(-10)}`;

let app: Awaited<ReturnType<typeof buildApp>>;
let placeId: string;
let fixtures: ReturnType<typeof createStepFixtures>;
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  fixtures = createStepFixtures(app.db);
  placeId = await fixtures.addPlace();
});
afterAll(async () => {
  await fixtures.cleanUp();
  const ids = await app.db
    .select({ id: affiliatePrograms.id })
    .from(affiliatePrograms)
    .where(like(affiliatePrograms.name, `${marker}%`));
  const programIds = ids.map((row) => row.id);
  if (programIds.length > 0) {
    await app.db
      .update(places)
      .set({ partnerProgramId: null })
      .where(inArray(places.partnerProgramId, programIds));
    await app.db.delete(adminActions).where(inArray(adminActions.targetId, programIds));
    await app.db.delete(affiliatePrograms).where(inArray(affiliatePrograms.id, programIds));
  }
  await app.db.delete(users).where(inArray(users.firebaseUid, createdUids));
  await app.close();
});

async function signIn(role: UserRole) {
  const { token, uid } = verifier.issue({ secondFactor: 'totp' });
  createdUids.push(uid);
  const [user] = await app.db
    .insert(users)
    .values({ id: uuidv7(), firebaseUid: uid, role })
    .returning();
  if (!user) throw new Error('User not created');
  return { id: user.id, headers: { authorization: `Bearer ${token}` } };
}

const send = (
  method: 'GET' | 'POST' | 'PATCH',
  headers: Record<string, string>,
  url: string,
  payload?: object,
) => app.inject({ method, url: `/v1/admin${url}`, headers, payload });
const program = (suffix: string, extra: object = {}) => ({
  name: `${marker} ${suffix}`,
  network: 'Awin',
  cookieDays: 30,
  ...extra,
});

describe('/v1/admin/affiliate-programs', () => {
  it('is for editors and admins, not for a moderator', async () => {
    const moderator = await signIn('moderator');
    const response = await send('GET', moderator.headers, '/affiliate-programs');
    expect(response.statusCode).toBe(403);
    expect(ApiError.parse(response.json()).code).toBe('forbidden');
  });

  it('registers a program as an editor, active by default, and journals it', async () => {
    const editor = await signIn('editor');
    const response = await send(
      'POST',
      editor.headers,
      '/affiliate-programs',
      program('A', { commissionNote: '5 %' }),
    );
    expect(response.statusCode).toBe(201);
    const created = AffiliateProgram.parse(response.json());
    expect(created).toMatchObject({
      isActive: true,
      commissionNote: '5 %',
      placeCount: 0,
      cookieDays: 30,
    });
    const [entry] = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, created.id));
    expect(entry).toMatchObject({
      action: 'affiliate_program.create',
      targetType: 'affiliate_program',
      actorId: editor.id,
    });
  });

  it('lists the programs, with the number of places that name each', async () => {
    const admin = await signIn('admin');
    const created = AffiliateProgram.parse(
      (await send('POST', admin.headers, '/affiliate-programs', program('B'))).json(),
    );
    await app.db
      .update(places)
      .set({ partnerBookingUrl: 'https://partner.example/lieu', partnerProgramId: created.id })
      .where(eq(places.id, placeId));
    try {
      const { items } = AffiliatePrograms.parse(
        (await send('GET', admin.headers, '/affiliate-programs')).json(),
      );
      expect(items.find((item) => item.id === created.id)).toMatchObject({ placeCount: 1 });
    } finally {
      await app.db
        .update(places)
        .set({ partnerBookingUrl: null, partnerProgramId: null })
        .where(eq(places.id, placeId));
    }
  });

  it('refuses a name already taken, whatever its case', async () => {
    const admin = await signIn('admin');
    await send('POST', admin.headers, '/affiliate-programs', program('C'));
    const again = await send('POST', admin.headers, '/affiliate-programs', {
      ...program('C'),
      name: `${marker} c`,
    });
    expect(again.statusCode).toBe(409);
    expect(ApiError.parse(again.json()).details).toEqual({ reason: 'name_taken' });
  });

  it('changes only the fields given, and journals the before and after', async () => {
    const admin = await signIn('admin');
    const created = AffiliateProgram.parse(
      (await send('POST', admin.headers, '/affiliate-programs', program('D'))).json(),
    );
    const response = await send('PATCH', admin.headers, `/affiliate-programs/${created.id}`, {
      isActive: false,
    });
    expect(AffiliateProgram.parse(response.json())).toMatchObject({
      isActive: false,
      network: 'Awin',
      cookieDays: 30,
    });
    const lines = await app.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.targetId, created.id));
    expect(lines.find((line) => line.action === 'affiliate_program.update')).toMatchObject({
      before: { isActive: true },
      after: { isActive: false },
    });
  });

  it('refuses a cookie out of bounds, an empty change and an unknown program', async () => {
    const admin = await signIn('admin');
    expect(
      (await send('POST', admin.headers, '/affiliate-programs', program('E', { cookieDays: 999 })))
        .statusCode,
    ).toBe(422);
    const created = AffiliateProgram.parse(
      (await send('POST', admin.headers, '/affiliate-programs', program('F'))).json(),
    );
    expect(
      (await send('PATCH', admin.headers, `/affiliate-programs/${created.id}`, {})).statusCode,
    ).toBe(422);
    expect(
      (await send('PATCH', admin.headers, `/affiliate-programs/${uuidv7()}`, { isActive: false }))
        .statusCode,
    ).toBe(404);
  });
});

/** Every page of the bookable steps the query gives, followed by its cursors. */
async function bookableSteps(headers: Record<string, string>, query = ''): Promise<BookableStep[]> {
  const items: BookableStep[] = [];
  let cursor: string | null = null;
  do {
    const url: string = `/bookable-steps?${query}${cursor ? `&cursor=${cursor}` : ''}`;
    const page = BookableSteps.parse((await send('GET', headers, url)).json());
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

describe('GET /v1/admin/bookable-steps', () => {
  it('is for editors and admins, not for a moderator', async () => {
    const moderator = await signIn('moderator');
    expect((await send('GET', moderator.headers, '/bookable-steps')).statusCode).toBe(403);
  });

  it('lists the steps that can be booked, with the link shown and where it comes from', async () => {
    const editor = await signIn('editor');
    const creator = await fixtures.addStep({ creatorUrl: 'https://creator.example/a' });
    const affiliate = await fixtures.addStep({
      creatorUrl: 'https://creator.example/b',
      isAffiliate: true,
    });
    const partner = await fixtures.addStep({
      partnerUrl: 'https://partner.example/c',
      programIsActive: true,
    });
    const required = await fixtures.addStep({ bookingRequired: true });
    const free = await fixtures.addStep({});
    const draft = await fixtures.addStep({
      creatorUrl: 'https://creator.example/d',
      routeStatus: 'draft',
    });

    const items = await bookableSteps(editor.headers);
    const byStep = new Map(items.map((item) => [item.stepId, item]));
    expect(byStep.get(creator)?.link).toEqual({
      url: 'https://creator.example/a',
      origin: 'creator',
    });
    expect(byStep.get(affiliate)?.link?.origin).toBe('creator_affiliate');
    expect(byStep.get(partner)).toMatchObject({
      link: { url: 'https://partner.example/c', origin: 'partner' },
      place: { hasPartnerLink: true },
    });
    expect(byStep.get(required)).toMatchObject({ link: null, place: { hasPartnerLink: false } });
    expect(byStep.has(free)).toBe(false);
    expect(byStep.has(draft)).toBe(false);
  });

  it('keeps the places without a partner link when asked', async () => {
    const admin = await signIn('admin');
    const withoutLink = await fixtures.addStep({ creatorUrl: 'https://creator.example/e' });
    const withLink = await fixtures.addStep({ partnerUrl: 'https://partner.example/f' });
    const ids = (await bookableSteps(admin.headers, 'withoutPartnerLink=true')).map(
      (item) => item.stepId,
    );
    expect(ids).toContain(withoutLink);
    expect(ids).not.toContain(withLink);
  });

  it('counts the clicks of the last 30 days, and puts the most clicked first', async () => {
    const admin = await signIn('admin');
    const popular = await fixtures.addStep({ creatorUrl: 'https://creator.example/g' });
    const old = await fixtures.addStep({ creatorUrl: 'https://creator.example/h' });
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    await app.db.insert(bookingClicks).values([
      { stepId: popular, linkOrigin: 'creator', createdAt: new Date(now - day) },
      { stepId: popular, linkOrigin: 'creator', createdAt: new Date(now - 29 * day) },
      { stepId: old, linkOrigin: 'creator', createdAt: new Date(now - 31 * day) },
    ]);
    const items = await bookableSteps(admin.headers);
    expect(items.find((item) => item.stepId === popular)?.clicks30Days).toBe(2);
    expect(items.find((item) => item.stepId === old)?.clicks30Days).toBe(0);
    expect(items.findIndex((item) => item.stepId === popular)).toBeLessThan(
      items.findIndex((item) => item.stepId === old),
    );
  });
});
