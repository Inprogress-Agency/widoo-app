import { AffiliateProgram, AffiliatePrograms, ApiError, type UserRole } from '@widoo/shared';
import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { adminActions, affiliatePrograms, places, users } from '../db/schema';
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
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
  await seed(app.db);
  const [place] = await app.db.select({ id: places.id }).from(places).limit(1);
  if (!place) throw new Error('No place in the seed');
  placeId = place.id;
});
afterAll(async () => {
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
